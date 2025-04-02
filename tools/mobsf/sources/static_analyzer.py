# -*- coding: utf_8 -*-
"""Android Static Code Analysis."""
from sources.common.common import logger, processControl, log_

from sources.common.utils import getChecksum
from sources.apk import apk_analysis
import os
import json
import zipfile
import shutil

def normalizeApk(apkFilePath):
    """
    Normalizes the APK file by copying it to a specified directory and extracting relevant data.

    This function performs the following steps:
        1. Determines the target storage directory for APK processing.
        2. Copies the APK file to the designated directory.
        3. Checks if the APK contains a `manifest.json` file.
        4. Parses the `manifest.json` file to extract additional metadata.
        5. If the APK contains split APKs, extracts the base APK file.
        6. Updates the APK file path and name accordingly.

    Args:
        record (dict): A dictionary containing information about the APK file, including:
            - `record['name']` (str): Name of the APK file.
            - `record['apkFile']` (str): Path to the source APK file.

    Returns:
        tuple: A tuple containing:
            - `apkFilePath` (str): The updated file path of the APK.
            - `apkFileName` (str): The updated APK filename.

    Raises:
        FileNotFoundError: If the source APK file does not exist.
        Exception: If an error occurs during file processing or manifest parsing.

    Example:
        >>> record = {"name": "example", "apkFile": "/downloads/example.apk"}
        >>> apkFilePath, apkFileName = normalizeApk(record)
        >>> print(apkFilePath, apkFileName)
        "/processed/example.apk", "example.apk"
    """
    apkDirectory = processControl.env['inputPath']
    outputPath = processControl.data['process']['filePath']
    apkFilePath = outputPath
    apkFileName = processControl.data['process']['filename']
    log_("info", logger, f"Moving to {outputPath}")

    try:
        with zipfile.ZipFile(processControl.data['process']['filePath'], 'r') as apk:
            # Check if manifest.json exists in the APK
            if "manifest.json" in apk.namelist():
                with apk.open("manifest.json") as manifestFile:
                    try:
                        # Decode the file content and parse JSON
                        manifestContent = manifestFile.read().decode("utf-8")
                        dataManifest = json.loads(manifestContent)
                    except Exception as e:
                        raise Exception(f"Failed to parse manifest in {apkFilePath}: {e}")
                package_name = dataManifest["package_name"]
                # Process split_apks if present in the manifest
                if "split_apks" in dataManifest:
                    split_apks = dataManifest["split_apks"]
                    for split_apk in split_apks:
                        if split_apk.get("id") == "base":
                            filepath = split_apk.get("file")
                            if filepath and filepath in apk.namelist():
                                apk.extract(filepath, apkDirectory)
                                extractedFilePath = os.path.join(apkDirectory, filepath)
                                log_("info", logger, f"Extracted base split APK to: {extractedFilePath}")
                                # Uncomment the line below if you want to delete the original APK file
                                os.remove(apkFilePath)
                                apkFilePath = extractedFilePath
                                apkFileName = os.path.splitext(filepath)[0]
                                apkFileName = filepath
    except FileNotFoundError:
        raise Exception(f"APK file {apkFilePath} not found.")
    except Exception as e:
        raise Exception(f"An error occurred: {e}")

    processControl.data['process']['filePath'] = apkFilePath
    processControl.data['process']['filename'] = apkFileName
    return True

def static_analyzer(request, checksum="", api=False):
    """
    Perform static analysis on an application and save the results to the database.

    This function analyzes an APK file based on its checksum or filename. If no checksum is provided,
    it calculates it from the specified file path. The function then sets up the analysis environment,
    logs the process, and calls the `apk_analysis` function.

    :param request: The filename of the APK to be analyzed.
    :type request: str
    :param checksum: The MD5 checksum of the APK file. If not provided, it will be computed.
    :type checksum: str, optional
    :param api: Flag to indicate whether the analysis is performed via an API request.
    :type api: bool, optional

    :return: The checksum of the analyzed APK file.
    :rtype: str

    :raises Exception: If an error occurs during the static analysis process.
    """

    """ 
    el fichero APK lo captura de robj = RecentScansDB.objects.filter(MD5=checksum)
    en request estoy pasando el fileName
    """
    filename = request
    rescan = False

    try:
        normalizeApk(processControl.data['process']['filePath'])
        if not checksum:
            checksum = getChecksum(processControl.data['process']['filePath'])

        fileProcessPath = f"{checksum}.apk"
        if os.path.exists(fileProcessPath):
            os.remove(fileProcessPath)

        app_dic = {}

        app_dic['dir'] = processControl.env['inputPath']  # BASE DIR
        app_dic['app_name'] = filename  # APP ORIGINAL NAME
        app_dic['md5'] = checksum  # MD5  EGA pending: validacion is_md5(checksum)
        app_dic['app_dir'] = processControl.env['outputPath']
        app_dic['tools_dir'] = processControl.env['tools']
        app_dic['icon_path'] = ''
        log_("info", logger, f'Scan Hash: {checksum}')
        log_("info", logger, f"start analysis {app_dic['app_name']}")
        processControl.data['app_dic'] = app_dic
        context = apk_analysis(request, app_dic, rescan, api)

        if processControl.args.result:
            if "apkId" in context:
                del context["apkId"]
            jsonResultsPath = os.path.join(processControl.args.result, f"{filename}.json")
            with open(jsonResultsPath, "w", encoding="utf-8") as f:
                json.dump(context, f, indent=4)

            log_("info", logger, f"Archivo JSON guardado correctamente. {jsonResultsPath}")

        fileSourcePath = os.path.join(processControl.env['inputPath'], processControl.data['process']['filename'])
        os.remove(fileSourcePath)
        filePath = os.path.join(processControl.env['inputPath'], fileProcessPath)
        os.remove(filePath)

        return checksum

    except Exception as exp:
        log_("exception", logger, f'Error: {exp}')
        pass