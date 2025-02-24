import json
import logging
import os
from pymongo import MongoClient
from sources.fileSystemUtils import checkFolder
from sources.logger import writeLog, configureLogger
from utils import getPathUrlsAppbrain, reorderListId

def processAppCategory(appCategory, saveFolder, appbrain, collection, logger, exceptionLogger):
    """
    Processes a single application category by retrieving, filtering, and storing host applications.

    :param appCategory: The category of applications to process.
    :type appCategory: str
    :param saveFolder: Path to the folder where results are saved.
    :type saveFolder: str
    :param appbrain: Base URL of AppBrain.
    :type appbrain: str
    :param collection: MongoDB collection to store host applications.
    :type collection: pymongo.collection.Collection
    :param logger: Logger for general logging.
    :type logger: logging.Logger
    :param exceptionLogger: Logger for exception logging.
    :type exceptionLogger: logging.Logger
    :return: Number of host apps added.
    :rtype: int
    """
    saveFile = os.path.join(saveFolder, f"{appCategory}.json")

    if os.path.exists(saveFile):
        with open(saveFile, "r") as existingFile:
            try:
                hostAppsList = json.load(existingFile)
            except json.JSONDecodeError:
                hostAppsList = []
    else:
        hostAppsList = []

    f = open(saveFile, "w")
    appCategoryUrl = f'https://www.appbrain.com/apps/most-downloaded/{appCategory}'
    pathUrls = getPathUrlsAppbrain(appCategoryUrl)
    pathUrls = list(dict.fromkeys(pathUrls))  # Remove duplicates

    hostAppsAdded = 0

    for pathUrl in pathUrls:
        try:
            if "/app/" in pathUrl:
                hostAppName, hostAppPackage = pathUrl.split("/")[-2:]
                hostAppLink = appbrain + pathUrl

                writeLog("debug", logger, f"Host app name:    \t{hostAppName}")
                writeLog("debug", logger, f"Host app package: \t{hostAppPackage}")
                writeLog("debug", logger, f"Host app link:    \t{hostAppLink}")

                existingApp = collection.find_one({"package": hostAppPackage})

                if not existingApp:
                    hostAppsAdded += 1
                    hostApp = {
                        "name": hostAppName,
                        "package": hostAppPackage,
                        "category": appCategory,
                    }
                    collection.insert_one(hostApp)
                    hostAppsList.append(hostApp)

                    writeLog("info", logger, f"Host app '{hostAppName}' added to the collection.")
                else:
                    writeLog("info", logger, f"Host app '{hostAppName}' already exists in the collection.")

        except Exception as e:
            writeLog("exception", exceptionLogger, f"Exception occurred: {e}")

    with open(saveFile, "w") as saveFileHandler:
        reorderedHostAppsList = reorderListId(hostAppsList)
        json.dump(reorderedHostAppsList, saveFileHandler, indent=4)

    writeLog("debug", logger, f"Host apps' category:            {appCategory}")
    writeLog("debug", logger, f"Number of host apps added:       {hostAppsAdded}")

    return hostAppsAdded

def main():
    """
    Main function to orchestrate the collection and storage of host applications data from AppBrain.
    """
    client = MongoClient('mongodb://10.201.54.162:49016')
    db = client['metadata']
    collection = db['apks']

    logFilePath = "../logs/hostAppsList.log"
    exceptionLogFilePath = "../logs/hostAppsListException.log"

    configureLogger(logFilePath, "w", "logger")
    configureLogger(exceptionLogFilePath, "w", "exceptionLogger")

    logger = logging.getLogger("logger")
    exceptionLogger = logging.getLogger("exceptionLogger")

    saveFolder = "../../results/hostAppsList/"
    checkFolder(saveFolder)

    appbrain = "https://www.appbrain.com"
    appCategories = ["social"]

    for appCategory in appCategories:
        processAppCategory(appCategory, saveFolder, appbrain, collection, logger, exceptionLogger)

if __name__ == '__main__':
    main()








