import json
import logging
import os
from pymongo import MongoClient
from sources.logger import writeLog, configureLogger
from sources.fileSystemUtils import checkFolder
from utils import downloadHostApk
from datetime import datetime, timezone


def processDocument(document, apksCollection, logger, exceptionLogger, nfsSaveFolder, lastDownloadTryDate, batchLimit,
                     downloadCount):
    """
    Processes a single APK document by downloading the APK, updating the MongoDB collection, and updating the corresponding JSON file.

    This function handles downloading the APK, updating the download status in the MongoDB collection,
    and updating the related JSON file with the latest download information.

    :param document: The MongoDB document containing APK details.
    :type document: dict
    :param apksCollection: The MongoDB collection for APKs.
    :type apksCollection: pymongo.collection.Collection
    :param logger: Logger for general logging.
    :type logger: logging.Logger
    :param exceptionLogger: Logger for exception logging.
    :type exceptionLogger: logging.Logger
    :param nfsSaveFolder: The base directory path where APKs should be saved.
    :type nfsSaveFolder: str
    :param lastDownloadTryDate: The current date in UTC formatted as YYYYMMDD.
    :type lastDownloadTryDate: str
    :param batchLimit: The maximum number of APKs to download in this batch.
    :type batchLimit: int
    :param downloadCount: The current count of downloaded APKs.
    :type downloadCount: int
    :return: Updated download count after processing the document.
    :rtype: int
    """
    if downloadCount >= batchLimit:
        return downloadCount

    try:
        category = document.get('category')
        categorySaveFolder = os.path.join(nfsSaveFolder, category)
        checkFolder(categorySaveFolder)

        hostAppName = document.get('name')
        hostAppPackage = document.get('package')

        apkSaveFolder = os.path.join(categorySaveFolder, hostAppPackage)
        checkFolder(apkSaveFolder)

        downloadUrl = f'https://apkpure.com/es/{hostAppName}/{hostAppPackage}/download'
        writeLog("debug", logger, "Downloading APK from: " + downloadUrl)

        downloadedVersion = downloadHostApk(downloadUrl, hostAppName, apkSaveFolder)

        downloadDate = None

        if downloadedVersion != document.get('downloadedVersion') and downloadedVersion != "Unknown":
            downloadDate = lastDownloadTryDate

            apksCollection.update_one(
                {"_id": document["_id"]},
                {"$set": {"downloadDate": downloadDate, "lastDownloadTryDate": lastDownloadTryDate,
                          "downloadedVersion": downloadedVersion}},
            )
        else:
            apksCollection.update_one(
                {"_id": document["_id"]},
                {"$set": {"lastDownloadTryDate": lastDownloadTryDate}},
            )

        jsonFilePath = os.path.join("../../results/hostAppsList/", f"{category}.json")
        if os.path.exists(jsonFilePath):
            with open(jsonFilePath, "r+", encoding="utf-8") as jsonFile:
                try:
                    apks = json.load(jsonFile)
                except json.JSONDecodeError as e:
                    writeLog("exception", exceptionLogger, f"Error decoding the JSON file {category}.json: \n{e}")
                    apks = []

                for apk in apks:
                    if apk.get("_id") == str(document["_id"]):
                        apk["lastDownloadTryDate"] = lastDownloadTryDate
                        if downloadDate:
                            apk["downloadDate"] = downloadDate
                        apk["downloadedVersion"] = downloadedVersion
                        break

                jsonFile.seek(0)
                json.dump(apks, jsonFile, ensure_ascii=False, indent=4)
                jsonFile.truncate()

        downloadCount += 1

    except Exception as e:
        hostAppName = document.get('name')
        hostAppPackage = document.get('package')
        writeLog("error", exceptionLogger,
                 f"Error downloading APK {hostAppName} ({hostAppPackage}) from {downloadUrl}: {str(e)}")

    return downloadCount


def main():
    """
    Main function to orchestrate the APK download process.
    """
    client = MongoClient('mongodb://10.201.54.162:49016')
    db = client['metadata']
    apksCollection = db['apks']

    logFilePath = "../logs/apk.log"
    exceptionLogFilePath = "../logs/apkException.log"

    configureLogger(logFilePath, "w", "logger")
    configureLogger(exceptionLogFilePath, "w", "exceptionLogger")

    logger = logging.getLogger("logger")
    exceptionLogger = logging.getLogger("exceptionLogger")

    nfsSaveFolder = "/home/dblancoaza/SafeMountain/nfs/incibePro/analisisAplicaciones/datasets/hostApks/"
    checkFolder(nfsSaveFolder)

    batchLimit = 5
    downloadCount = 0

    with client.start_session() as session:
        lastDownloadTryDate = datetime.now(timezone.utc).strftime("%Y%m%d")

        documents = apksCollection.find(
            {
                "lastDownloadTryDate": {"$ne": lastDownloadTryDate}
            },
            no_cursor_timeout=True,
            session=session
        ).batch_size(5)

        try:
            for document in documents:
                if downloadCount >= batchLimit:
                    break

                downloadCount = processDocument(
                    document,
                    apksCollection,
                    logger,
                    exceptionLogger,
                    nfsSaveFolder,
                    lastDownloadTryDate,
                    batchLimit,
                    downloadCount
                )
        finally:
            documents.close()


if __name__ == '__main__':
    main()
