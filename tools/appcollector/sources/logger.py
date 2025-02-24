import logging

def configureLogger(logFilePath, mode, loggerName):
    """
    Configures a logger with both file and console handlers.

    This function sets up a logger with the specified name, directing log messages
    to both a file and the console. It ensures that multiple handlers are not
    added to the logger if it has already been configured.

    :param logFilePath: The file path where the log messages will be stored.
                        Example: "../logs/apk.log"
    :type logFilePath: str
    :param mode: The mode in which the log file is opened.
                 - "w" for write mode (overwrites existing file)
                 - "a" for append mode (adds to existing file)
    :type mode: str
    :param loggerName: The name identifier for the logger.
                       Example: "logger" or "exceptionLogger"
    :type loggerName: str
    :return: The configured logger instance.
    :rtype: logging.Logger
    """
    logger = logging.getLogger(loggerName)

    if not logger.hasHandlers():
        logger.setLevel(logging.DEBUG)

        fileHandler = logging.FileHandler(logFilePath, mode=mode)
        fileHandler.setLevel(logging.DEBUG)

        formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
        fileHandler.setFormatter(formatter)

        logger.addHandler(fileHandler)

        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)

        logger.addHandler(console_handler)

    return logger


def writeLog(logType, logger, msg):
    """
    Writes a log message to the specified logger based on the log type.

    This function simplifies logging by allowing the caller to specify the
    type of log message (e.g., info, warning, debug, error, exception) and
    directing the message to the appropriate logging method.

    :param logType: The severity level of the log message.
                    Accepted values:
                    - "info" for informational messages
                    - "warning" for warning messages
                    - "debug" for debug-level messages
                    - "error" for error messages
                    - "exception" for exception tracebacks
    :type logType: str
    :param logger: The logger instance to which the message will be logged.
                   This should be a logger configured using `configureLogger`.
    :type logger: logging.Logger
    :param msg: The log message to be recorded.
               This can be any string describing the event or error.
    :type msg: str
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
