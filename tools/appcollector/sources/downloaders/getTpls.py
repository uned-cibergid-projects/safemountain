import logging
import os
import asyncio
from pymongo import MongoClient
from sources.logger import writeLog, configureLogger
from sources.fileSystemUtils import checkFolder
from datetime import datetime, timezone
from bson.objectid import ObjectId
import aiohttp


async def downloadTpl(versionDoc, tplSaveFolder, semaphore, versionsCollection, maxRetries=3):
    """
    Asynchronously downloads a Template (TPL) file from a specified URL and saves it to the designated folder.

    The function attempts to download the TPL file up to `maxRetries` times in case of failures such as timeouts
    or client errors. Upon successful download, it updates the `lastTimeChecked` field in the corresponding
    version document in the MongoDB collection.

    :param versionDoc: The MongoDB document containing version details, including the download URL and version code.
    :type versionDoc: dict
    :param tplSaveFolder: The directory path where the downloaded TPL files should be saved.
    :type tplSaveFolder: str
    :param semaphore: An asyncio semaphore to limit the number of concurrent download operations.
    :type semaphore: asyncio.Semaphore
    :param versionsCollection: The MongoDB collection for storing version documents.
    :type versionsCollection: pymongo.collection.Collection
    :param maxRetries: The maximum number of retry attempts for downloading the TPL file. Defaults to 3.
    :type maxRetries: int
    :return: None
    :rtype: None
    """
    logger = logging.getLogger("logger")
    exceptionLogger = logging.getLogger("exceptionLogger")

    retries = 0
    while retries < maxRetries:
        async with semaphore:
            try:
                downloadUrl = versionDoc["downloadUrl"]
                versionCode = versionDoc["versionCode"]

                timeout = aiohttp.ClientTimeout(total=300)

                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.get(downloadUrl) as response:
                        if response.status == 200:
                            contentDisposition = response.headers.get('Content-Disposition', '')
                            if 'filename=' in contentDisposition:
                                suggestedFilename = contentDisposition.split('filename=')[-1].strip('"')
                            else:
                                suggestedFilename = os.path.basename(downloadUrl)
                            _, extension = os.path.splitext(suggestedFilename)
                            extension = extension[1:]
                            checkFolder(tplSaveFolder)
                            savePath = os.path.join(tplSaveFolder, f"{versionCode}.{extension}")

                            chunkSize = 65536  # 64 KB
                            with open(savePath, 'wb') as f:
                                async for chunk in response.content.iter_chunked(chunkSize):
                                    if chunk:
                                        f.write(chunk)
                            writeLog("debug", logger, f'TPL successfully downloaded: {savePath}')

                            currentTime = datetime.now(timezone.utc).strftime("%Y%m%d")
                            versionsCollection.update_one(
                                {"_id": versionDoc["_id"]},
                                {"$set": {"lastTimeChecked": currentTime}}
                            )
                            return
                        else:
                            writeLog("error", exceptionLogger,
                                     f'Failed to download TPL from {downloadUrl} with status code {response.status}')
                            break
            except (asyncio.TimeoutError, aiohttp.ClientError) as e:
                retries += 1
                writeLog("error", exceptionLogger,
                         f'Error while downloading {downloadUrl}, retry {retries}/{maxRetries}: {e}')
                await asyncio.sleep(2)
            except Exception as e:
                writeLog("error", exceptionLogger, f'Unexpected error in downloadTpl: {e}')
                break
    writeLog("error", exceptionLogger,
             f'Failed to download TPL from {downloadUrl} after {maxRetries} retries')


async def worker(queue, semaphore, versionsCollection):
    """
    Asynchronous worker that continuously processes items from the queue to download TPL files.

    Each worker retrieves an item from the queue, which contains the version document and the folder
    where the TPL should be saved, and invokes the `downloadTpl` function to perform the download.

    :param queue: An asyncio queue containing items to be processed, where each item is a dictionary with keys
                  'versionDoc' and 'tplSaveFolder'.
    :type queue: asyncio.Queue
    :param semaphore: An asyncio semaphore to limit the number of concurrent download operations.
    :type semaphore: asyncio.Semaphore
    :param versionsCollection: The MongoDB collection for storing version documents.
    :type versionsCollection: pymongo.collection.Collection
    :return: None
    :rtype: None
    """
    while True:
        item = await queue.get()
        if item is None:
            break
        await downloadTpl(item['versionDoc'], item['tplSaveFolder'], semaphore, versionsCollection)
        queue.task_done()


async def main():
    """
    The main asynchronous function orchestrating the download of TPL files.
    """
    client = MongoClient('mongodb://10.201.54.162:49016')
    db = client['metadata']
    tplsCollection = db['tpls']
    versionsCollection = db['versions']

    logFilePath = "../logs/tpl.log"
    exceptionLogFilePath = "../logs/tplException.log"

    configureLogger(logFilePath, "a", "logger")
    configureLogger(exceptionLogFilePath, "a", "exceptionLogger")

    logger = logging.getLogger("logger")
    exceptionLogger = logging.getLogger("exceptionLogger")

    nfsSaveFolder = "/home/ciber/projects/SafeMountain/nfs/incibePro/analisisAplicaciones/datasets/tpls/"
    checkFolder(nfsSaveFolder)

    semaphore = asyncio.Semaphore(3)

    queue = asyncio.Queue()

    docsToProcess = versionsCollection.find(
        {"type": "tpl", "lastTimeChecked": {"$exists": False}}
    ).limit(100)

    docsList = list(docsToProcess)
    if not docsList:
        writeLog("info", logger, "No TPL versions without lastTimeChecked to download.")
        return

    for versionDoc in docsList:
        parentId = versionDoc.get("parentId")
        if not parentId:
            writeLog("error", exceptionLogger, f'Missing parentId in versionDoc {versionDoc.get("_id")}')
            continue

        if not isinstance(parentId, ObjectId):
            parentId = ObjectId(parentId)

        tplDoc = tplsCollection.find_one({"_id": parentId})
        if not tplDoc:
            writeLog("error", exceptionLogger,
                     f'No TPL document found for parentId {parentId} in versionDoc {versionDoc.get("_id")}')
            continue

        package = tplDoc.get("package")
        name = tplDoc.get("name")
        if package and name:
            versionDoc['package'] = package
            versionDoc['name'] = name

            packageParts = package.split('.')

            packageSaveFolder = os.path.join(nfsSaveFolder, *packageParts)
            checkFolder(packageSaveFolder)

            tplSaveFolder = os.path.join(packageSaveFolder, name)
            checkFolder(tplSaveFolder)

            await queue.put({'versionDoc': versionDoc, 'tplSaveFolder': tplSaveFolder})
        else:
            writeLog("error", exceptionLogger,
                     f'Missing package or name in tplDoc for versionDoc {versionDoc.get("_id")}')

    if queue.empty():
        writeLog("info", logger, "No TPL versions with package and name to download.")
        return

    numWorkers = 3
    workerTasks = []
    for _ in range(numWorkers):
        task = asyncio.create_task(worker(queue, semaphore, versionsCollection))
        workerTasks.append(task)

    await queue.join()

    for _ in range(numWorkers):
        await queue.put(None)

    await asyncio.gather(*workerTasks)


if __name__ == '__main__':
    asyncio.run(main())
