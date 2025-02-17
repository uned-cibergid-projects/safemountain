from sources.common import global_vars
import logging
from logging.handlers import RotatingFileHandler

#READABILITY_JS_PATH = join(dirname(__file__), 'js/readability/Readability.js')
#READABILITY_SRC = open(READABILITY_JS_PATH).read()

class HttpStatusError(Exception):
    pass

class controlProcess():
    def __init__(self,  process={}, data={}, env={}, args={}, settings={}):
        self.process = process
        self.data = data
        self.env = env
        self.args = args
        self.settings = settings

    def to_dict(self):
        return {
            "process": self.process,
            "data": self.data,
            "env": self.env,
            "args": self.args,
            "settings": self.settings,
        }
global_vars.procCtrl = controlProcess()
processControl = global_vars.procCtrl


# Constants
COLORS = {
    "info": "\033[32m",       # Green for info
    "warning": "\033[33m",    # Yellow for warnings
    "error": "\033[31m",      # Red for errors
    "debug": "\033[34m",      # Blue for debug
    "exception": "\033[35m",  # Magenta for exceptions
    "reset": "\033[0m"        # Reset to default
}

class ColoredFormatter(logging.Formatter):
    """
    @Desc: Custom formatter to add color to the console output.
    @Usage: Enhances console log readability by adding color coding.
    """
    def format(self, record):
        color = COLORS.get(record.levelname.lower(), COLORS["reset"])
        message = super().format(record)
        return f"{color}{message}{COLORS['reset']}"

def configureLogger(type="log", loggerName="corpusLog"):
    """
    @Desc: Configures and returns a logger with rotating file and colored console handlers.
    @Result: Logger instance ready for logging operations.
    """
    if type == "log":
        logFilePath = "./ProcessLog.txt"
    elif type == "proc":
        logFilePath = "./Process.txt"
    logger = logging.getLogger(loggerName)

    if not logger.hasHandlers():
        logger.setLevel(logging.DEBUG)

        # Rotating file handler
        fileHandler = RotatingFileHandler(logFilePath, maxBytes=5 * 1024 * 1024, backupCount=5)
        formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
        fileHandler.setFormatter(formatter)
        logger.addHandler(fileHandler)

        # Console handler with colored output
        if type == "log":
            # Console handler with colored output
            console_handler = logging.StreamHandler()
            color_formatter = ColoredFormatter('%(asctime)s [%(levelname)s] %(message)s')
            console_handler.setFormatter(color_formatter)
            logger.addHandler(console_handler)

    return logger

def setLogger(logger, debug):
    """
    @Desc: Sets logger level based on debug value.
    @Usage: Adjusts the log detail according to the debug level specified.
    """
    if debug == 1:
        logger.setLevel(logging.DEBUG)
    elif debug == 2:
        logger.setLevel(logging.INFO)

def log_(logType, logger, msg):
    """
    @Desc: Logs a message with specified log type.
    @Usage: Calls logger method according to logType.
    """
    if logType == "info":
        logger.info(msg)
    elif logType == "warning":
        logger.warning(msg)
    elif logType == "debug":
        logger.debug(msg)
    elif logType == "error":
        logger.error(msg)
    elif logType == "exception":
        logger.exception(msg)
    else:
        logger.error("Invalid log type specified: %s", logType)

logger = configureLogger("log", "corpusLog")
logProc = configureLogger("proc", "corpusProc")
