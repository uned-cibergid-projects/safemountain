import json
import logging
import os
from pymongo import MongoClient
from sources.fileSystemUtils import checkFolder
from sources.logger import writeLog, configureLogger
from utils import getHrefs, reorderListId

MAVEN_REPO_URL = "https://repo.maven.apache.org/maven2/"
MAVEN_REPO_NAME = "maven2"


def getDirectoryUrls(urls):
    """
    Filters and returns URLs that represent valid directories.

    :param urls: List of URLs obtained from the Maven repository.
    :type urls: list
    :return: List of URLs that end with '/' and do not start with '..'.
    :rtype: list
    """
    directoryUrls = []
    for url in urls:
        if url.endswith('/') and not url.startswith('..'):
            directoryUrls.append(url)
    return directoryUrls


def getTPLsDirectories():
    """
    Retrieves the complete URLs of TPL directories from the Maven repository.

    :return: List of complete URLs of TPL directories.
    :rtype: list
    """
    urls = getHrefs(MAVEN_REPO_URL)
    directoryUrls = getDirectoryUrls(urls)
    tplsDirectories = [MAVEN_REPO_URL + directoryUrl for directoryUrl in directoryUrls]
    return tplsDirectories


def main():
    """
    Main function to orchestrate the collection and storage of TPL directory metadata.
    """

    try:
        client = MongoClient('mongodb://10.201.54.162:49016')
        db = client['metadata']
        collection = db['tplDirectories']

        logFilePath = "../logs/tplDirectories.log"
        exceptionLogFilePath = "../logs/tplDirectoriesException.log"

        configureLogger(logFilePath, "w", "logger")
        configureLogger(exceptionLogFilePath, "w", "exceptionLogger")

        logger = logging.getLogger("logger")
        exceptionLogger = logging.getLogger("exceptionLogger")

        saveFolder = "../../results/tplDirectories/"
        checkFolder(saveFolder)

        tplsDirectories = getTPLsDirectories()

        saveFile = os.path.join(saveFolder, f"{MAVEN_REPO_NAME}.json")
        if os.path.exists(saveFile):
            with open(saveFile, "r") as existingFile:
                try:
                    tplDirectoryList = json.load(existingFile)
                except json.JSONDecodeError:
                    tplDirectoryList = []
        else:
            tplDirectoryList = []

        for tplDirectory in tplsDirectories:
            try:
                writeLog("debug", logger, "TPL Directory:    \t" + tplDirectory)

                existingDirectory = collection.find_one({"url": tplDirectory})

                if not existingDirectory:
                    tplDirectoryAdded = {"url": tplDirectory}
                    collection.insert_one(tplDirectoryAdded)
                    tplDirectoryList.append(tplDirectoryAdded)

                    writeLog("info", logger, f"TPL directory '{tplDirectory}' added to the collection.")
                else:
                    writeLog("info", logger, f"TPL directory '{tplDirectory}' already exists in the collection.")

            except Exception as e:
                writeLog("exception", exceptionLogger, f"Exception occurred: {e}")

        with open(saveFile, "w") as saveFileHandler:
            reorderedTplDirectoryList = reorderListId(tplDirectoryList)
            json.dump(reorderedTplDirectoryList, saveFileHandler, indent=4)

    except Exception as e:
        writeLog("exception", exceptionLogger, f"An error occurred in the main function: {e}")


if __name__ == '__main__':
    main()
