from sources.common.common import processControl
import json

import time
import re
import os
from os.path import isdir
import hashlib
import zipfile
from pathlib import Path
import shutil
from urllib.parse import urlparse
import socket
from concurrent.futures import (
    ThreadPoolExecutor,
    TimeoutError as ThreadPoolTimeoutError,
)
from sources.entropy import (
    get_entropies,
)
import subprocess
import io
import ntpath

STRINGS_REGEX = re.compile(r'(?<=\")(.+?)(?=\")|(?<=\<string>)(.+?)(?=\<)')
GOOGLE_API_KEY_REGEX = re.compile(r'AIza[0-9A-Za-z-_]{35}$')
GOOGLE_APP_ID_REGEX = re.compile(r'\d{1,2}:\d{1,50}:android:[a-f0-9]{1,50}')
PKG_REGEX = re.compile(
    r'package\s+([a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*);')

RESERVED_FILE_NAMES = [
    'AndroidManifest.xml',
    'resources.arsc',
    'META-INF/MANIFEST.MF',
    'META-INF/CERT.SF',
    'META-INF/CERT.RSA',
    'META-INF/CERT.DSA',
    'classes.dex']

def mkdir(dir_path):
    """
    @Desc: Creates directory if it doesn't exist.
    @Usage: Ensures a directory exists before proceeding with file operations.
    """
    if not isdir(dir_path):
        os.makedirs(dir_path)


def dbTimestamp():
    """
    @Desc: Generates a timestamp formatted as "YYYYMMDDHHMMSS".
    @Result: Formatted timestamp string.
    """
    timestamp = int(time.time())
    formatted_timestamp = str(time.strftime("%Y%m%d%H%M%S", time.gmtime(timestamp)))
    return formatted_timestamp

class configLoader:
    """
    @Desc: Loads and provides access to JSON configuration data.
    @Usage: Instantiates with path to config JSON file.
    """
    def __init__(self, config_path='config/config.json'):
        self.base_path = os.path.realpath(os.getcwd())
        realConfigPath = os.path.join(self.base_path, config_path)
        self.config = self.load_config(realConfigPath)

    def load_config(self, realConfigPath):
        """
        @Desc: Loads JSON configuration file.
        @Result: Returns parsed JSON configuration as a dictionary.
        """
        with open(realConfigPath, 'r') as config_file:
            return json.load(config_file)

    def get_environment(self):
        """
        @Desc: Retrieves MongoDB configuration details.
        @Result: MongoDB configuration data or None if unavailable.
        """
        environment =  self.config.get("environment", None)
        environment["realPath"] = self.base_path
        return environment

    def get_settings(self):
        """
        @Desc: Retrieves environment settings from the configuration.
        @Result: Environment configuration dictionary.
        """
        return self.config.get("settings", {})

    def get_storage(self):
        """
        @Desc: Retrieves MongoDB configuration details.
        @Result: MongoDB configuration data or None if unavailable.
        """
        return  self.config.get("storage", None)

    def get_mongo(self):
        """
        @Desc: Retrieves MongoDB configuration details.
        @Result: MongoDB configuration data or None if unavailable.
        """
        return  self.config.get("mongo", None)


def file_size(app_path):
    """Return the size of the file."""
    return round(float(os.path.getsize(app_path)) / (1024 * 1024), 2)


def hash_gen(checksum, app_path) -> tuple:
    """Generate and return sha1 and sha256 as a tuple."""
    try:
        sha1 = hashlib.sha1()
        sha256 = hashlib.sha256()
        block_size = 65536
        with open(app_path, mode='rb') as afile:
            buf = afile.read(block_size)
            while buf:
                sha1.update(buf)
                sha256.update(buf)
                buf = afile.read(block_size)
        sha1val = sha1.hexdigest()
        sha256val = sha256.hexdigest()
        return sha1val, sha256val
    except Exception as exp:
        raise Exception('Failed to generate Hashes')



def unzip(checksum, app_path, ext_path):
    """Unzip APK.

    Unzip a APK archive while handling encrypted files, reserved file conflicts,
    path traversal (Zip Slip), and permission adjustments. Some of the anti-analysis
    techniques used by malware authors and packers are handled here.

    Args:
        checksum (str): The checksum of the file.
        app_path (str): Path to the ZIP archive.
        ext_path (str): Path to extract the files.

    Returns:
        list: A list of files extracted or an empty list if an error occurs.
    """

    files = []
    original_ext_path = ext_path
    try:
        with zipfile.ZipFile(app_path, 'r') as zipptr:
            files = zipptr.namelist()
            for fileinfo in zipptr.infolist():
                ext_path = original_ext_path

                # Skip encrypted files
                if fileinfo.flag_bits & 0x1:
                    #msg = ('Skipping encrypted file '
                    #       f'{sanitize_for_logging(fileinfo.filename)}')
                    #logger.warning(msg)
                    continue

                file_path = fileinfo.filename.rstrip('/\\')  # Remove trailing slashes

                # Decode the filename
                if not isinstance(file_path, str):
                    file_path = file_path.decode('utf-8', errors='replace')

                # Check for reserved file conflict
                if is_reserved_file_conflict(file_path):
                    ext_path = str(Path(ext_path) / '_conflict_')

                # Handle Zip Slip
                if is_path_traversal(file_path):
                    #msg = ('Zip slip detected. skipped extracting'
                    #       f' {sanitize_for_logging(file_path)}')
                    #logger.error(msg)
                    continue

                # Fix permissions
                if fileinfo.is_dir():
                    # Directories should have rwxr-xr-x (755)
                    # Skip creating directories
                    continue
                else:
                    # Files should have rw-r--r-- (644)
                    fileinfo.external_attr = (0o100644 << 16) | (
                        fileinfo.external_attr & 0xFFFF)

                # Extract the file
                try:
                    zipptr.extract(file_path, ext_path)
                except Exception as e:
                    raise Exception(f'Failed to extract file: {file_path}')
                    #logger.warning(
                    #    'Failed to extract %s', sanitize_for_logging(file_path))
    except Exception as exp:
        files = []

    return files


def is_reserved_file_conflict(file_path):
    """Check for reserved file conflict."""
    if any(file_path.startswith(i) and file_path != i for i in RESERVED_FILE_NAMES):
        return True
    return False

def is_path_traversal(user_input):
    """Check for path traversal."""
    if not user_input:
        return False
    if (('../' in user_input)
        or ('%2e%2e' in user_input)
        or ('..' in user_input)
            or ('%252e' in user_input)):
        #logger.error('Path traversal attack detected')
        return True
    return False

def getChecksum(filePath):
    apk_data = open(filePath, 'rb').read()  # Lee el archivo APK
    return hashlib.sha256(apk_data).hexdigest()

def find_aapt(tool_name):
    """Find the specified tool (aapt or aapt2)."""
    # Check system PATH for the tool
    tool_path = shutil.which(tool_name)
    if tool_path:
        return tool_path

    # Check common Android SDK locations
    home_dir = Path.home()  # Get the user's home directory
    sdk_paths = [
        home_dir / 'Library' / 'Android' / 'sdk',  # macOS
        home_dir / 'Android' / 'Sdk',              # Linux
        home_dir / 'AppData' / 'Local' / 'Android' / 'Sdk',  # Windows
        home_dir / 'Documentos' / 'RealProy' / 'static' / 'tools',
        processControl.env['tools']
    ]

    # EGA
    return os.path.join(processControl.env['tools'], 'aapt2')

    for sdk_path in sdk_paths:
        build_tools_path = sdk_path / 'build-tools'
        if build_tools_path.exists():
            for version in sorted(build_tools_path.iterdir(), reverse=True):
                tool_path = version / tool_name
                if tool_path.exists():
                    return str(tool_path)

    return None

def is_path_traversal(user_input):
    """Check for path traversal."""
    if not user_input:
        return False
    if (('../' in user_input)
        or ('%2e%2e' in user_input)
        or ('..' in user_input)
            or ('%252e' in user_input)):
        #logger.error('Path traversal attack detected')

        return True
    return False

class TaskTimeoutError(Exception):
    pass

def run_with_timeout(func, limit, *args, **kwargs):
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(func, *args, **kwargs)
        try:
            return future.result(timeout=limit)
        except ThreadPoolTimeoutError:
            msg = f'function <{func.__name__}> timed out after {limit} seconds'
            raise TaskTimeoutError(msg)


def run_with_timeout(func, limit, *args, **kwargs):
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(func, *args, **kwargs)
        try:
            return future.result(timeout=limit)
        except ThreadPoolTimeoutError:
            msg = f'function <{func.__name__}> timed out after {limit} seconds'
            raise TaskTimeoutError(msg)

def is_dir_exists(dir_path):
    if os.path.isdir(dir_path):
        return True
    else:
        return False

def is_file_exists(file_path):
    if os.path.isfile(file_path):
        return True
    # This fix situation where a user just typed "adb" or another executable
    # inside settings.py/config.py
    if shutil.which(file_path):
        return True
    else:
        return False

def find_java_binary():
    """Find Java."""
    #EGA init
    return 'java'
    #EGA end
"""
    # Respect user settings
    if platform.system() == 'Windows':
        jbin = 'java.exe'
    else:
        jbin = 'java'
    if is_dir_exists(settings.JAVA_DIRECTORY):
        if settings.JAVA_DIRECTORY.endswith('/'):
            return settings.JAVA_DIRECTORY + jbin
        elif settings.JAVA_DIRECTORY.endswith('\\'):
            return settings.JAVA_DIRECTORY + jbin
        else:
            return settings.JAVA_DIRECTORY + '/' + jbin
    if os.getenv('JAVA_HOME'):
        java = os.path.join(
            os.getenv('JAVA_HOME'),
            'bin',
            jbin)
        if is_file_exists(java):
            return java
    return 'java'
"""

def gen_sha256_hash(msg):
    """Generate SHA 256 Hash of the message."""
    if isinstance(msg, str):
        msg = msg.encode('utf-8')
    hash_object = hashlib.sha256(msg)
    return hash_object.hexdigest()

def strings_util(filename, minimum=6):
    """Print out all connected series of readable chars longer than minimum."""
    with io.open(filename, mode='rb') as f:
        result = ''
        for c in f.read().decode('utf-8', 'ignore'):
            if c in ('0123456789abcdefghijklmnopqrs'
                     'tuvwxyzABCDEFGHIJKLMNOPQRSTUV'
                     'WXYZ!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~ '):
                result += c
                continue
            if len(result) >= minimum and result[0].isalnum():
                yield '\'' + result + '\''
            result = ''


def get_os_strings(filename):
    try:
        strings_bin = shutil.which('strings')
        if not strings_bin:
            return None
        strings = subprocess.check_output([strings_bin, filename])
        return strings.decode('utf-8', 'ignore').splitlines()
    except Exception:
        return None


def strings_on_binary(bin_path):
    """Extract strings from binary."""
    try:
        strings = get_os_strings(bin_path)
        if strings:
            return list(set(strings))
        if isinstance(strings, list):
            return []
        # Only run if OS strings is not present
        return list(set(strings_util(bin_path)))
    except Exception:
        #logger.exception('Extracting strings from binary')
        pass
    return []

def filename_from_path(path):
    head, tail = ntpath.split(path)
    return tail or ntpath.basename(head)


def get_android_src_dir(app_dir, typ):
    """Get Android source code location."""
    src = None
    if typ == 'apk':
        src = app_dir / 'java_source'
    elif typ == 'studio':
        src = app_dir / 'app' / 'src' / 'main' / 'java'
        kt = app_dir / 'app' / 'src' / 'main' / 'kotlin'
        if not src.exists() and kt.exists():
            src = kt
    elif typ == 'eclipse':
        src = app_dir / 'src'
    return src

def append_scan_status(checksum, status, exception=None):
    #EGA ini elimino
    pass
"""
    #Append Scan Status to Database.
    try:
        db_obj = RecentScansDB.objects.get(MD5=checksum)
        if status == 'init':
            db_obj.SCAN_LOGS = []
            db_obj.save()
            return
        current_logs = python_dict(db_obj.SCAN_LOGS)
        current_logs.append({
            'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            'status': status,
            'exception': exception})
        db_obj.SCAN_LOGS = current_logs
        db_obj.save()
    except RecentScansDB.DoesNotExist:
        # Expected to fail for iOS Dynamic Analysis Report Generation
        # Calls MalwareScan and TrackerScan with different checksum
        pass
    except Exception:
        logger.exception('Appending Scan Status to Database')
"""
URL_REGEX = re.compile(
    (
        r'((?:https?://|s?ftps?://|'
        r'file://|javascript:|data:|www\d{0,3}[.])'
        r'[\w().=/;,#:@?&~*+!$%\'{}-]+)'
    ),
    re.UNICODE)

EMAIL_REGEX = re.compile(r'[\w+.-]{1,20}@[\w-]{1,20}\.[\w]{2,10}')

def url_n_email_extract(dat, relative_path):
    """Extract URLs and Emails from Source Code."""
    urls = set()
    emails = set()
    urllist = []
    url_n_file = []
    email_n_file = []
    # URL Extraction
    urllist = URL_REGEX.findall(dat.lower())
    for url in urllist:
        urls.add(url)
    if urls:
        url_n_file.append({
            'urls': list(urls),
            #EGA 'path': escape(relative_path)})
            'path': relative_path})

    # Email Extraction
    for email in EMAIL_REGEX.findall(dat.lower()):
        if not email.startswith('//'):
            emails.add(email)
    if emails:
        email_n_file.append({
            'emails': list(emails),
            #EGA 'path': escape(relative_path)})
            'path': relative_path})
    return urllist, url_n_file, email_n_file


def is_secret_key(key):
    """Check if the key in the key/value pair is interesting."""
    key_lower = key.lower()
    # Key ends with these strings
    endswith = (
        'api', 'key', 'secret', 'token', 'username',
        'user_name', 'user', 'pass', 'password',
        'private_key', 'access_key',
    )
    # Key contains these strings
    contains = (
        'api_', 'key_', 'aws', 's3_', '_s3', 'secret_',
        'bearer', 'jwt', 'certificate"', 'credential',
        'azure', 'webhook', 'twilio_', 'bitcoin',
        '_auth', 'firebase', 'oauth', 'authorization',
        'private', 'pwd', 'session', 'token_', 'gcp',
    )
    # Key must not contain these strings
    not_string = (
        'label_', 'text', 'hint', 'msg_', 'create_',
        'message', 'new', 'confirm', 'activity_',
        'forgot', 'dashboard_', 'current_', 'signup',
        'sign_in', 'signin', 'title_', 'welcome_',
        'change_', 'this_', 'the_', 'placeholder',
        'invalid_', 'btn_', 'action_', 'prompt_',
        'lable', 'hide_', 'old', 'update', 'error',
        'empty', 'txt_', 'lbl_',
    )
    not_contains_str = any(i in key_lower for i in not_string)
    contains_str = any(i in key_lower for i in contains)
    endswith_str = any(key_lower.endswith(i) for i in endswith)
    return (endswith_str or contains_str) and not not_contains_str

def strings_and_entropies(checksum, src, exts):
    """Get Strings and Entropies."""
    msg = 'Extracting String values and entropies from Code'
    #logger.info(msg)
    #append_scan_status(checksum, msg)
    data = {
        'strings': set(),
        'secrets': set(),
    }
    try:
        if not (src and src.exists()):
            return data
        excludes = ('\\u0', 'com.google.')
        eslash = ('Ljava', 'Lkotlin', 'kotlin', 'android')
        for p in src.rglob('*'):
            if p.suffix not in exts or not p.exists():
                continue
            matches = STRINGS_REGEX.finditer(
                p.read_text(encoding='utf-8', errors='ignore'),
                re.MULTILINE)
            for match in matches:
                string = match.group()
                if len(string) < 4:
                    continue
                if any(i in string for i in excludes):
                    continue
                if any(i in string and '/' in string for i in eslash):
                    continue
                if not string[0].isalnum():
                    continue
                data['strings'].add(string)
        if data['strings']:
            data['secrets'] = get_entropies(data['strings'])
    except Exception as exp:
        msg = 'Failed to extract String values and entropies from Code'
        #EGA logger.exception(msg)
        #append_scan_status(checksum, msg, repr(exp))

    return data

def valid_host(host):
    """Check if host is valid."""
    try:
        prefixs = ('http://', 'https://')
        if not host.startswith(prefixs):
            host = f'http://{host}'
        parsed = urlparse(host)
        domain = parsed.netloc
        path = parsed.path
        if len(domain) == 0:
            # No valid domain
            return False
        if len(path) > 0:
            # Only host is allowed
            return False
        if ':' in domain:
            # IPv6
            return False
        # Local network
        invalid_prefix = (
            '100.64.',
            '127.',
            '192.',
            '198.',
            '10.',
            '172.',
            '169.',
            '0.',
            '203.0.',
            '224.0.',
            '240.0',
            '255.255.',
            'localhost',
            '::1',
            '64::ff9b::',
            '100::',
            '2001::',
            '2002::',
            'fc00::',
            'fe80::',
            'ff00::')
        if domain.startswith(invalid_prefix):
            return False
        ip = socket.gethostbyname(domain)
        if ip.startswith(invalid_prefix):
            # Resolve dns to get IP
            return False
        return True
    except Exception:
        return False

def upstream_proxy(flaw_type):
    """
    #Set upstream Proxy if needed.
    if settings.UPSTREAM_PROXY_ENABLED:
        if not settings.UPSTREAM_PROXY_USERNAME:
            proxy_port = str(settings.UPSTREAM_PROXY_PORT)
            proxy_host = '{}://{}:{}'.format(
                settings.UPSTREAM_PROXY_TYPE,
                docker_translate_proxy_ip(settings.UPSTREAM_PROXY_IP),
                proxy_port)
            proxies = {flaw_type: proxy_host}
        else:
            proxy_port = str(settings.UPSTREAM_PROXY_PORT)
            proxy_host = '{}://{}:{}@{}:{}'.format(
                settings.UPSTREAM_PROXY_TYPE,
                settings.UPSTREAM_PROXY_USERNAME,
                settings.UPSTREAM_PROXY_PASSWORD,
                docker_translate_proxy_ip(settings.UPSTREAM_PROXY_IP),
                proxy_port)
            proxies = {flaw_type: proxy_host}
    else:
        proxies = {flaw_type: None}
    verify = settings.UPSTREAM_PROXY_SSL_VERIFY in ('1', '"1"')
    return proxies, verify
    """
    #EGA
    return {flaw_type: None}, False

