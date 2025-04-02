from sources.common.common import processControl

from pymongo import MongoClient, errors
from pymongo.server_api import ServerApi


class Mongodb:

    def __init__(self, mongoCol, mongoDb):
        self.mongoCol = mongoCol
        self.mongoDb = mongoDb
        self.uri = processControl.env['mongo']['MONGO_CONNECT']
        self.client = None
        self.collection = None
        self.connect()

    def connect(self):
        try:
            self.client = MongoClient(self.uri, server_api=ServerApi('1'))
            self.client.admin.command('ping')
            db = self.client[self.mongoDb]
            self.collection = db[self.mongoCol]
        except Exception as e:
            raise ConnectionError(f"Could not connect to MongoDB: {e}")

    def getOneRecord(self, criteria):
        try:
            result = self.collection.find_one(criteria)
            return result
        except errors.PyMongoError as e:
            return False, f"Could not fetch MongoDB data with error: {e}"

    def getRecordsList(self, query, top):
        if top == "all":
            records = processControl.env['mongo']['MAX_RECORDSLIST']
        else:
            records = top
        try:
            results = list(self.collection.find(query).sort('timestamp', 1).limit(records))
        except errors.PyMongoError as e:
            raise f"Could not gest Corpus with error: {e}"
        return results

    def insertRecord(self, data):
        """
        Insert one or multiple documents into the collection.

        :param data: Document or list of documents to insert.
        :return: Result of the insertion or error message.
        """
        try:
            # If data is a list, insert multiple documents
            if isinstance(data, list):
                result = self.collection.insert_many(data)
                # Add the inserted `_id` field to the original documents
                for i, record in enumerate(data):
                    record["_id"] = result.inserted_ids[i]
                return data  # Return list of inserted records with `_id`

            # If data is a single document (dictionary), insert it
            if isinstance(data, dict):
                result = self.collection.insert_one(data)
                # Add the inserted `_id` field to the original document
                data["_id"] = result.inserted_id
                return data  # Return the inserted record with `_id`

            # If data is neither a list nor a dictionary, raise a ValueError
            raise ValueError("Data must be a dictionary or a list of dictionaries.")

        except errors.PyMongoError as e:
            raise Exception(f"Could not insert data into MongoDB: {e}")
        except ValueError as e:
            raise Exception(str(e))

    def updateOne(self, filter_query, update_data):
        """
        Updates a single document in the collection.

        :param filter_query: Query to match the document to update.
        :param update_data: Update operation to apply.
        :return: Update result or error message.
        """
        try:
            result = self.collection.update_one(filter_query, update_data)
            if result.matched_count > 0:
                return True, "Update successful."
            else:
                raise Exception("No document matched the query.")
        except errors.PyMongoError as e:
            raise Exception(f"Could not update MongoDB record: {e}")


def accessMetadata(packageName):
    try:
        mongoApk = Mongodb(processControl.env['mongo']['MONGO_APK_COL'], processControl.env['mongo']['MONGO_METADATA_DB'])
        result = mongoApk.getOneRecord({"package": packageName})
        if not result:
            raise Exception(f"Could not get metadata for {packageName}")
        return result
    except errors.PyMongoError as e:
        raise Exception(f"Could not access MongoDB metadata: {e}")

def storeAnalisys(values):
    try:
        recordMeta = accessMetadata(values["package_name"])
        values['apkId']= recordMeta["_id"]
        mongo = Mongodb(
            processControl.env['mongo']['MONGO_STATIC_COL'],
            processControl.env['mongo']['MONGO_ANALISIS_DB']
        )
        result = mongo.getOneRecord({"md5": values["md5"]})
        if result:
            result, message = mongo.updateOne({'_id': result['_id']}, {"$set": values})
            if not result:
                raise Exception(f"Update failed: {message}")
        else:
            result = mongo.insertRecord(values)
        return result

    except KeyError as e:
        raise Exception(f"Missing required key: {e}")
    except Exception as e:
        raise Exception(f"storeAnalisys failed: {e}")


def getDataEstatico(checksum):
    try:
        mongo = Mongodb(
            processControl.env['mongo']['MONGO_STATIC_COL'],
            processControl.env['mongo']['MONGO_ANALISIS_DB']
        )
        result = mongo.getOneRecord({"md5": checksum})
        if not result:
            return False
        return result

    except Exception as e:
        raise Exception(str(e))


def storeBoard(context):
    try:
        mongo = Mongodb("scoreboard", "pruebas")
        result = mongo.getOneRecord({"hash": context["hash"]})
        if result:
            result, message = mongo.updateOne({'_id': result['_id']}, {"$set": context})
            if not result:
                raise Exception(f"Update failed: {message}")
        else:
            result = mongo.insertRecord(context)
        return result

    except KeyError as e:
        raise Exception(f"Missing required key: {e}")
    except Exception as e:
        raise Exception(f"storeBoard failed: {e}")