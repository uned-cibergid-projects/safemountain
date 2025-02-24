import logging
import json
import os
import re
from packaging import version
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta
import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from sources.logger import writeLog, configureLogger
from sources.fileSystemUtils import checkFolder

MAVEN_REPO_NAME = "maven2"

async def getTplMetadata(uniqueTpls, tplsCollection):
    """
    Extracts metadata for each unique TPL from the Maven Central Repository and updates the `tplsCollection`.

    :param uniqueTpls: List of unique TPLs to process.
    :type uniqueTpls: list of dict
    :param tplsCollection: MongoDB collection where TPL metadata is stored.
    :type tplsCollection: pymongo.collection.Collection
    """
    logger = logging.getLogger("logger")
    exceptionLogger = logging.getLogger("exceptionLogger")
    semaphore = asyncio.Semaphore(10)  # Limit the number of concurrent tasks

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        async def processUniqueTpl(uniqueTpl):
            """
            Processes a single TPL to extract and update its metadata.

            :param uniqueTpl: A dictionary containing 'name' and 'package' of the TPL.
            :type uniqueTpl: dict
            """
            async with semaphore:
                currentTime = datetime.now(timezone.utc).strftime("%Y%m%d")
                name = uniqueTpl["name"]
                package = uniqueTpl["package"]
                mavenCentralRepositoryUrl = f"https://central.sonatype.com/artifact/{package}/{name}"

                existingTpl = tplsCollection.find_one({"name": name, "package": package})

                if existingTpl and "lastTimeChecked" in existingTpl:
                    lastTimeChecked = existingTpl["lastTimeChecked"]

                    lastTimeCheckedDatetime = datetime.strptime(lastTimeChecked, "%Y%m%d").replace(tzinfo=timezone.utc)
                    currentTimeDatetime = datetime.strptime(currentTime, "%Y%m%d").replace(tzinfo=timezone.utc)

                    timeDifference = currentTimeDatetime - lastTimeCheckedDatetime

                    mustBeChecked = timeDifference >= timedelta(weeks=2)
                else:
                    mustBeChecked = True

                if mustBeChecked:
                    try:
                        writeLog("info", logger, f"Surfing Maven Central Repository: {mavenCentralRepositoryUrl}")
                        page = await browser.new_page()
                        await page.goto(mavenCentralRepositoryUrl, timeout=300000)
                        content = await page.content()
                        soup = BeautifulSoup(content, "html.parser")
                        overviewDiv = soup.find("div", {"data-test": "overview"})
                        pomFilePre = soup.find("pre", {"data-test": "pom-file"})
                        ossindexMetadataVulnerabilitiesSpan = soup.find("span", {"data-test": "ossindex-metadata-vulnerabilities"})
                        publishedMetadataDiv = soup.find("div", {"data-test": "published-metadata"})
                        licensesLi = soup.find_all("li", {"data-test": "license"})
                        sizeMetadataDiv = soup.find("div", {"data-test": "size-metadata"})
                        projectUrlAnchor = soup.find("a", {"data-test": "project-url"})
                        issueManagementUrlAnchor = soup.find("a", {"data-test": "issue-management-url"})
                        scmUrlAnchor = soup.find("a", {"data-test": "scm-url"})
                        ciManagementAnchor = soup.find("a", {"data-test": "ci-management-url"})

                        newMetadata = {
                            "descripcion": overviewDiv.get_text(strip=True) if overviewDiv else None,
                            "pomFile": pomFilePre.get_text(strip=True) if pomFilePre else None,
                            "ossindexVulnerabilities": ossindexMetadataVulnerabilitiesSpan.get_text(strip=True) if ossindexMetadataVulnerabilitiesSpan else None,
                            "published": publishedMetadataDiv.get_text(strip=True) if publishedMetadataDiv else None,
                            "licenses": [licenseLi.get_text(strip=True) for licenseLi in licensesLi] if licensesLi else [],
                            "size": sizeMetadataDiv.get_text(strip=True) if sizeMetadataDiv else None,
                            "projectUrl": projectUrlAnchor['href'] if projectUrlAnchor else None,
                            "issueTrackerUrl": issueManagementUrlAnchor['href'] if issueManagementUrlAnchor else None,
                            "sourceControlUrl": scmUrlAnchor['href'] if scmUrlAnchor else None,
                            "continuousIntegrationUrl": ciManagementAnchor['href'] if ciManagementAnchor else None,
                            "lastTimeChecked": currentTime
                        }

                        # Update MongoDB with metadata.
                        tplsCollection.update_one(
                            {"name": name, "package": package},
                            {"$set": newMetadata}
                        )
                    except Exception as e:
                        writeLog("exception", exceptionLogger, f"Error fetching metadata from Central Maven Repository for {name}: {e}")
                    finally:
                        await page.close()
                else:
                    writeLog("info", logger, f"TPL has already been checked: {mavenCentralRepositoryUrl}")

        # Create asynchronous tasks for each TPL
        tasks = [processUniqueTpl(uniqueTpl) for uniqueTpl in uniqueTpls]

        # Execute tasks concurrently
        await asyncio.gather(*tasks)

        await browser.close()
    return

def isTplFile(url):
    """
    Checks if the URL corresponds to a valid TPL file (excluding javadoc, tests, sources).

    :param url: URL to check.
    :type url: str
    :return: True if it is a valid TPL file, False otherwise.
    :rtype: bool
    """
    pattern = r"^(?!.*(javadoc|tests|sources)).*$"
    return re.search(pattern, url) is not None

def isValidVersion(versionStr):
    """
    Checks if the version string is a valid version.

    :param versionStr: Version string to check.
    :type versionStr: str
    :return: True if it is a valid version, False otherwise.
    :rtype: bool
    """
    try:
        version.parse(versionStr)
        return True
    except:
        return False

async def isSignificantVersion(newVersion, existingVersionsList, semaphore, exceptionLogger):
    """
    Determines if the new version is significant by comparing its major version with the existing major versions.

    :param newVersion: The new version to compare.
    :type newVersion: str
    :param existingVersionsList: List of existing version codes.
    :type existingVersionsList: list of str
    :param semaphore: Semaphore to limit concurrency.
    :type semaphore: asyncio.Semaphore
    :param exceptionLogger: Logger for exceptions.
    :type exceptionLogger: logging.Logger
    :return: True if the version is significant, False otherwise.
    :rtype: bool
    """
    try:
        newVersionParsed = version.parse(newVersion)
        if not isinstance(newVersionParsed, version.Version):
            return False
    except Exception as e:
        writeLog("exception", exceptionLogger, f"Error parsing newVersion: {newVersion}, {e}")
        return False

    newMajorVersion = newVersionParsed.major

    existingMajorVersions = []
    for existingVersion in existingVersionsList:
        try:
            existingVersionParsed = version.parse(existingVersion)
            if isinstance(existingVersionParsed, version.Version):
                existingMajorVersions.append(existingVersionParsed.major)
        except Exception as e:
            writeLog("exception", exceptionLogger, f"Error parsing existingVersion: {existingVersion}, {e}")
            continue

    if not existingMajorVersions:
        return True

    maxExistingMajorVersion = max(existingMajorVersions)
    if newMajorVersion > maxExistingMajorVersion:
        return True
    else:
        return False


async def filterSignificantVersionsMetadata(jarFilesUrls, tplsCollection, versionsCollection):
    """
    Filters significant versions from the list of jar file URLs and updates the database.

    :param jarFilesUrls: List of jar file URLs.
    :type jarFilesUrls: list of str
    :param tplsCollection: MongoDB collection for TPLs.
    :type tplsCollection: pymongo.collection.Collection
    :param versionsCollection: MongoDB collection for versions.
    :type versionsCollection: pymongo.collection.Collection
    :return: List of significant versions metadata.
    :rtype: list of dict
    """
    significantVersionsMetadata = []
    semaphore = asyncio.Semaphore(10)
    logger = logging.getLogger("logger")
    exceptionLogger = logging.getLogger("exceptionLogger")

    try:
        for jarFileUrl in jarFilesUrls:
            jarFileUrlMetadata = extractJarFileUrlMetadata(jarFileUrl)
            if not jarFileUrlMetadata:
                continue

            name = jarFileUrlMetadata['name']
            package = jarFileUrlMetadata["package"]
            newVersion = jarFileUrlMetadata["version"]

            if not isValidVersion(newVersion):
                writeLog("exception", exceptionLogger, f"Invalid newVersion format: {newVersion}")
                continue

            existingTpl = tplsCollection.find_one({"name": name, "package": package})

            if existingTpl:
                existingVersions = versionsCollection.find({"parentId": existingTpl["_id"]})
                existingVersionsList = [v["versionCode"] for v in existingVersions if isValidVersion(v["versionCode"])]

                isSignificant = await isSignificantVersion(newVersion, existingVersionsList, semaphore, exceptionLogger)

                if isSignificant:
                    newSignificantVersion = {
                        "parentId": existingTpl["_id"],
                        "type": "tpl",
                        "versionCode": newVersion,
                        "downloadUrl": jarFileUrl
                    }

                    # Update MongoDB with metadata.
                    versionsCollection.insert_one(newSignificantVersion)

                    newSignificantVersion["name"] = name
                    newSignificantVersion["package"] = package
                    significantVersionsMetadata.append(newSignificantVersion)
            else:

                newTpl = {
                    "name": name,
                    "package": package
                }
                tplsCollection.insert_one(newTpl)
                createdTpl = tplsCollection.find_one({"name": name, "package": package})

                newSignificantVersion = {
                    "parentId": createdTpl["_id"],
                    "type": "tpl",
                    "versionCode": newVersion,
                    "downloadUrl": jarFileUrl
                }

                versionsCollection.insert_one(newSignificantVersion)

                newSignificantVersion["name"] = name
                newSignificantVersion["package"] = package
                significantVersionsMetadata.append(newSignificantVersion)

        return significantVersionsMetadata
    except Exception as e:
        writeLog("exception", exceptionLogger, f"Error while filtering significant versions metadata: {e}")

def extractJarFileUrlMetadata(url):
    """
    Extracts metadata from the jar file URL.

    :param url: URL of the jar file.
    :type url: str
    :return: Dictionary with 'name', 'package', and 'version'.
    :rtype: dict
    """
    pattern = r"https://repo\.maven\.apache\.org/maven2/((?:[^/]+/)+)([^/]+)/([^/]+)/.*\.(jar|aar)"
    match = re.match(pattern, url)

    if match:
        packageParts = match.group(1).strip('/').split('/')
        package = '.'.join(packageParts)
        name = match.group(2)
        version = match.group(3)
        return {
            "name": name,
            "package": package,
            "version": version
        }
    else:
        return {}

async def searchJarFilesUrls(directoryUrl, jarFilesUrls, semaphore):
    """
    Searches for jar file URLs starting from the given directory URL.

    :param directoryUrl: Starting directory URL.
    :type directoryUrl: str
    :param jarFilesUrls: List to store found jar file URLs.
    :type jarFilesUrls: list
    :param semaphore: Semaphore to limit concurrency.
    :type semaphore: asyncio.Semaphore
    :return: List of jar file URLs.
    :rtype: list
    """
    queue = [directoryUrl]
    logger = logging.getLogger("logger")
    exceptionLogger = logging.getLogger("exceptionLogger")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        while queue:
            currentUrl = queue.pop(0)
            async with semaphore:
                page = await browser.new_page()
                try:
                    await page.goto(currentUrl)
                    writeLog("info", logger, f"Surfing directory: {currentUrl}")
                    await page.wait_for_selector("a")
                    content = await page.content()
                    soup = BeautifulSoup(content, "html.parser")
                    urls = soup.select("a")

                    subdirs = []
                    files = []
                    for urlElement in urls:
                        href = urlElement.get("href")
                        if href.startswith('..'):
                            continue
                        elif href.endswith('/'):
                            subdirName = href.rstrip('/')
                            subdirs.append(subdirName)
                        else:
                            files.append(href)

                    versionSubdirs = []
                    nonVersionSubdirs = []
                    for subdir in subdirs:
                        if isValidVersion(subdir):
                            try:
                                parsedVersion = version.parse(subdir)
                                versionSubdirs.append((parsedVersion, subdir))
                            except Exception as e:
                                writeLog("exception", exceptionLogger, f"Error parsing version: {subdir}, {e}")
                                nonVersionSubdirs.append(subdir)
                        else:
                            nonVersionSubdirs.append(subdir)

                    if versionSubdirs:
                        versionSubdirs.sort(reverse=True)
                        for parsedVersion, versionStr in versionSubdirs:
                            versionUrl = currentUrl + versionStr + '/'
                            writeLog("info", logger, f"Checking version directory: {versionUrl}")
                            await page.goto(versionUrl)
                            await page.wait_for_selector("a")
                            versionContent = await page.content()
                            versionSoup = BeautifulSoup(versionContent, "html.parser")
                            versionUrls = versionSoup.select("a")
                            for urlElement in versionUrls:
                                href = urlElement.get("href")
                                if href.startswith('..'):
                                    continue
                                elif href and re.search(r"\.(jar|aar)$", href):
                                    if isTplFile(href):
                                        jarFileUrl = versionUrl + href
                                        jarFilesUrls.append(jarFileUrl)
                                        break
                            else:
                                continue
                            break

                    for subdirName in nonVersionSubdirs:
                        updatedDirectoryUrl = currentUrl + subdirName + '/'
                        queue.append(updatedDirectoryUrl)

                except Exception as e:
                    writeLog("exception", exceptionLogger, f"Error while traversing: {currentUrl}, {e}")
                finally:
                    await page.close()
        await browser.close()
    return jarFilesUrls


async def getJarFilesUrls(tplDirectoriesCollection, saveFolder):
    """
    Retrieves jar file URLs from TPL directories that need to be processed.

    :param tplDirectoriesCollection: MongoDB collection of TPL directories.
    :type tplDirectoriesCollection: pymongo.collection.Collection
    :param saveFolder: Path to the folder where results are saved.
    :type saveFolder: str
    :return: List of jar file URLs.
    :rtype: list
    """
    jarFilesUrls = []
    logger = logging.getLogger("logger")
    exceptionLogger = logging.getLogger("exceptionLogger")
    currentTime = datetime.now(timezone.utc).strftime("%Y%m%d")

    twoWeeksAgo = (datetime.now(timezone.utc) - timedelta(weeks=2)).strftime("%Y%m%d")

    document = tplDirectoriesCollection.find_one({
        "$or": [
            {"lastTimeChecked": {"$exists": False}},
            {"lastTimeChecked": {"$lt": twoWeeksAgo}}
        ]
    })

    if document:
        lastTimeChecked = document.get("lastTimeChecked", None)
        writeLog("info", logger, "Processing TPL Directory:")

        writeLog("info", logger, f"Id: {str(document['_id'])}")
        writeLog("info", logger, f"Url: {document['url']}")
        writeLog("info", logger, f"Last time checked: {lastTimeChecked}")
        writeLog("info", logger, f"Current time: {currentTime}")

        directoryUrl = document["url"]

        semaphore = asyncio.Semaphore(40)

        jarFilesUrls = await searchJarFilesUrls(directoryUrl, jarFilesUrls, semaphore)

        # Update MongoDB with metadata.
        tplDirectoriesCollection.update_one(
            {"_id": document["_id"]},
            {"$set": {"lastTimeChecked": currentTime}},
        )

        # Update JSON with metadata.
        jsonFilePath = os.path.join(saveFolder, f"{MAVEN_REPO_NAME}.json")
        if os.path.exists(jsonFilePath):
            with open(jsonFilePath, "r+", encoding="utf-8") as jsonFile:
                try:
                    tplDirectories = json.load(jsonFile)
                except json.JSONDecodeError as e:
                    writeLog("exception", exceptionLogger,
                             f"Error decoding the JSON file {MAVEN_REPO_NAME}.json: \n{e}")
                    tplDirectories = []

                for tplDirectory in tplDirectories:
                    if tplDirectory.get("_id") == str(document["_id"]):
                        tplDirectory.update({"lastTimeChecked": currentTime})
                        break

                jsonFile.seek(0)
                json.dump(tplDirectories, jsonFile, ensure_ascii=False, indent=4)
                jsonFile.truncate()

        writeLog("info", logger, f"Updated TPL directory last check time: {document['url']}")
    else:
        writeLog("info", logger, "There are no more TPL directories to process.")

    return jarFilesUrls

async def getUniqueTpls(significantVersionsMetadata):
    """
    Obtains a list of unique TPLs from significant versions metadata.

    :param significantVersionsMetadata: List of significant versions metadata.
    :type significantVersionsMetadata: list of dict
    :return: List of unique TPLs.
    :rtype: list of dict
    """
    uniqueCombinations = set()
    uniqueList = []

    for doc in significantVersionsMetadata:
        name = doc["name"]
        package = doc["package"]
        if (name, package) not in uniqueCombinations:
            uniqueCombinations.add((name, package))
            uniqueList.append({"name": name, "package": package})

    return uniqueList

async def main():
    """
    Main function to orchestrate the metadata collection process.
    """
    client = MongoClient('mongodb://10.201.54.162:49016')
    db = client['metadata']
    tplDirectoriesCollection = db['tplDirectories']
    tplsCollection = db['tpls']
    versionsCollection = db['versions']

    logFilePath = "../logs/tplsMetadata.log"
    exceptionLogFilePath = "../logs/tplsMetadataException.log"

    configureLogger(logFilePath, "w", "logger")
    configureLogger(exceptionLogFilePath, "w", "exceptionLogger")

    logger = logging.getLogger("logger")
    exceptionLogger = logging.getLogger("exceptionLogger")

    saveFolder = "../../results/tplDirectories/"
    checkFolder(saveFolder)

    versionSaveFolder = "../../results/versionsList/"
    checkFolder(versionSaveFolder)

    writeLog("info", logger, "Starting TPL metadata collection process")

    jarFilesUrls = await getJarFilesUrls(tplDirectoriesCollection, saveFolder)

    if jarFilesUrls:
        significantVersionsMetadata = await filterSignificantVersionsMetadata(jarFilesUrls, tplsCollection, versionsCollection)
        uniqueTpls = await getUniqueTpls(significantVersionsMetadata)
        await getTplMetadata(uniqueTpls, tplsCollection)
    else:
        writeLog("info", logger, "No jarFilesUrls were found to process.")

if __name__ == '__main__':
    asyncio.run(main())
