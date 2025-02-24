import logging
import json
import os
import sys
from bson.objectid import ObjectId
from google_play_scraper import app
from pymongo import MongoClient
from sources.logger import writeLog, configureLogger


def getMetadata(document, exceptionLogger):
    """
    Retrieves metadata for a given application from the Google Play Store.

    :param document: The MongoDB document containing application details.
    :type document: dict
    :param exceptionLogger: Logger for exception logging.
    :type exceptionLogger: logging.Logger
    :return: A tuple containing application metadata and version metadata.
    :rtype: tuple (dict, dict)
    """
    apkId = document.get("_id")
    package = document.get("package")

    try:
        resultGooglePlayScraper = app(package)

        appMetadata = {
            'title': resultGooglePlayScraper['title'],
            'description': resultGooglePlayScraper['description'],
            'installs': resultGooglePlayScraper['installs'],
            'realInstalls': resultGooglePlayScraper['realInstalls'],
            'score': resultGooglePlayScraper['score'],
            'ratings': resultGooglePlayScraper['ratings'],
            'reviews': resultGooglePlayScraper['reviews'],
            'histogram': resultGooglePlayScraper['histogram'],
            'price': resultGooglePlayScraper['price'],
            'free': resultGooglePlayScraper['free'],
            'currency': resultGooglePlayScraper['currency'],
            'developer': resultGooglePlayScraper['developer'],
            'developerEmail': resultGooglePlayScraper['developerEmail'],
            'developerWebsiteUrl': resultGooglePlayScraper['developerWebsite'],
            'privacyPolicyUrl': resultGooglePlayScraper['privacyPolicy'],
            'genre': resultGooglePlayScraper['genre'],
            'genreId': resultGooglePlayScraper['genreId'],
            'iconUrl': resultGooglePlayScraper['icon'],
            'headerImageUrl': resultGooglePlayScraper['headerImage'],
            'screenshotsUrls': resultGooglePlayScraper['screenshots'],
            'videoUrl': resultGooglePlayScraper['video'],
            'videoImageUrl': resultGooglePlayScraper['videoImage'],
            'contentRating': resultGooglePlayScraper['contentRating'],
            'contentRatingDescription': resultGooglePlayScraper['contentRatingDescription'],
            'adSupported': resultGooglePlayScraper['adSupported'],
            'containsAds': resultGooglePlayScraper['containsAds'],
            'released': resultGooglePlayScraper['released'],
            'googlePlayUrl': f'https://play.google.com/store/apps/details?id={package}',
        }

        versionMetadata = {
            'parentId': apkId,
            'type': 'apk',
            'versionCode': resultGooglePlayScraper['version'],
            'releaseDate': resultGooglePlayScraper['lastUpdatedOn'],
        }

        return appMetadata, versionMetadata

    except Exception as e:
        writeLog(
            "exception",
            exceptionLogger,
            f"Exception occurred: \n{e}\n"
            f"The requested URL was not found on Google Play Store server\n"
            f"Id: {document.get('_id')}\n"
            f"Name: {document.get('name')}\n"
            f"Package: {document.get('package')}"
        )
        return {}, {}


def addMetadata(document, apksCollection, versionsCollection, logger, exceptionLogger):
    """
    Adds metadata to the MongoDB collections and updates JSON files with the retrieved metadata.

    :param document: The MongoDB document containing application details.
    :type document: dict
    :param apksCollection: The MongoDB collection for APKs.
    :type apksCollection: pymongo.collection.Collection
    :param versionsCollection: The MongoDB collection for versions.
    :type versionsCollection: pymongo.collection.Collection
    :param logger: Logger for general logging.
    :type logger: logging.Logger
    :param exceptionLogger: Logger for exception logging.
    :type exceptionLogger: logging.Logger
    :return: None
    :rtype: None
    """
    appMetadata, versionMetadata = getMetadata(document, exceptionLogger)

    # Si se pudo obtener metadata con éxito
    if appMetadata and versionMetadata:

        apkSaveFolder = "../../results/hostAppsList/"
        versionSaveFolder = "../../results/versionsList/"

        # Actualizar mongo con la metadata de la aplicación
        apksCollection.update_one(
            {"_id": document["_id"]},
            {"$set": appMetadata}
        )

        # Actualizar JSON con la metadata de la aplicación
        category = document.get("category")
        if category:
            jsonFilePath = os.path.join(apkSaveFolder, f"{category}.json")
            if os.path.exists(jsonFilePath):
                with open(jsonFilePath, "r+", encoding="utf-8") as jsonFile:
                    try:
                        apks = json.load(jsonFile)
                    except json.JSONDecodeError as e:
                        writeLog(
                            "exception",
                            exceptionLogger,
                            f"Error decoding the JSON file {category}.json: \n{e}"
                        )
                        apks = []

                    for apk in apks:
                        if apk.get("_id") == str(document["_id"]):
                            apk.update(appMetadata)
                            break

                    jsonFile.seek(0)
                    json.dump(apks, jsonFile, ensure_ascii=False, indent=4)
                    jsonFile.truncate()

        writeLog("info", logger, "Actualizada metadata de la APK")

        # Verificar si la versión ya existe
        existingVersion = versionsCollection.find_one({
            "type": versionMetadata["type"],
            "parentId": document["_id"],
            "versionCode": versionMetadata["versionCode"]
        })

        if not existingVersion:
            # Insertar la nueva versión en la colección de versiones
            insert_result = versionsCollection.insert_one(versionMetadata)
            writeLog(
                "info",
                logger,
                f"Se ha actualizado la versión {versionMetadata['versionCode']} de la "
                f"APK de name: {document['name']} y package {document['package']}"
            )

            # Actualizar el archivo JSON correspondiente a la versión
            typeSaveFolder = os.path.join(versionSaveFolder, f"{versionMetadata['type']}")
            packageSaveFolder = os.path.join(typeSaveFolder, f"{document['package']}")
            saveFile = os.path.join(packageSaveFolder, f"{document['name']}.json")

            os.makedirs(typeSaveFolder, exist_ok=True)
            os.makedirs(packageSaveFolder, exist_ok=True)

            if os.path.exists(saveFile):
                with open(saveFile, "r", encoding="utf-8") as existingFile:
                    try:
                        versionsList = json.load(existingFile)
                    except json.JSONDecodeError:
                        versionsList = []
            else:
                versionsList = []

            versionExists = False
            for version in versionsList:
                if version.get("versionCode") == versionMetadata["versionCode"]:
                    versionExists = True
                    break

            if not versionExists:
                # Asegurarnos de convertir ObjectId a string si fuese necesario
                if isinstance(versionMetadata.get("_id"), ObjectId):
                    newVersion = {
                        "_id": str(versionMetadata["_id"]),
                        "parentId": str(document["_id"]),
                        "type": versionMetadata["type"],
                        "versionCode": versionMetadata["versionCode"],
                        "releaseDate": versionMetadata["releaseDate"]
                    }
                else:
                    newVersion = {
                        "_id": str(insert_result.inserted_id),
                        "parentId": str(document["_id"]),
                        "type": versionMetadata["type"],
                        "versionCode": versionMetadata["versionCode"],
                        "releaseDate": versionMetadata["releaseDate"]
                    }
                versionsList.append(newVersion)

            with open(saveFile, "w", encoding="utf-8") as jsonFile:
                json.dump(versionsList, jsonFile, ensure_ascii=False, indent=4)

        else:
            writeLog(
                "info",
                logger,
                "La metadata de la última versión de la APK ya estaba registrada en Mongo"
            )


def getMetadataGooglePlay(apksCollection, versionsCollection, logger, exceptionLogger):
    """
    Retrieves and processes metadata for all applications in the APKs collection from Google Play Store.

    :param apksCollection: The MongoDB collection for APKs.
    :type apksCollection: pymongo.collection.Collection
    :param versionsCollection: The MongoDB collection for versions.
    :type versionsCollection: pymongo.collection.Collection
    :param logger: Logger for general logging.
    :type logger: logging.Logger
    :param exceptionLogger: Logger for exception logging.
    :type exceptionLogger: logging.Logger
    :return: None
    :rtype: None
    """
    documents = apksCollection.find({})
    for document in documents:
        writeLog("info", logger, "Processing app:")
        writeLog("info", logger, f"Id: {document['_id']}")
        writeLog("info", logger, f"Name: {document['name']}")
        writeLog("info", logger, f"Package: {document['package']}")
        addMetadata(document, apksCollection, versionsCollection, logger, exceptionLogger)


def main():
    """
    Main function to orchestrate the metadata collection process.
    """

    client = MongoClient('mongodb://10.201.54.162:49016')
    db = client['metadata']
    apksCollection = db['apks']
    versionsCollection = db['versions']

    logDirectory = os.path.abspath(os.path.join(os.path.dirname(__file__), "../logs"))

    logFilePath = os.path.join(logDirectory, "hostAppsMetadata.log")
    exceptionLogFilePath = os.path.join(logDirectory, "hostAppsMetadataException.log")

    configureLogger(logFilePath, "w", "logger")
    configureLogger(exceptionLogFilePath, "w", "exceptionLogger")

    logger = logging.getLogger("logger")
    exceptionLogger = logging.getLogger("exceptionLogger")

    writeLog("info", logger, "Iniciando proceso de recolección de metadata de APKs")

    if len(sys.argv) > 1:
        apkDataJson = sys.argv[1]
        try:
            apkData = json.loads(apkDataJson)
        except json.JSONDecodeError as e:
            writeLog("exception", exceptionLogger, f"Error al decodificar JSON: {e}")
            sys.exit(1)
    else:
        apkData = None

    if apkData:
        name = apkData.get("name")
        package = apkData.get("package")
        category = apkData.get("category")

        if not all([name, package, category]):
            writeLog("exception", exceptionLogger,
                     "Los campos 'name', 'package' y 'category' son obligatorios.")
            sys.exit(1)

        baseDocument = {
            "name": name,
            "package": package,
            "category": category,
        }
        result = apksCollection.insert_one(baseDocument)
        inserted_id = result.inserted_id
        baseDocument["_id"] = inserted_id

        addMetadata(baseDocument, apksCollection, versionsCollection, logger, exceptionLogger)

    else:
        getMetadataGooglePlay(apksCollection, versionsCollection, logger, exceptionLogger)


if __name__ == '__main__':
    main()
