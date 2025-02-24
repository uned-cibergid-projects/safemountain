# AppCollector

## Getting started

Create a completely clean Python virtual environment (named appcollector_env):

```bash
python3.10 -m venv appcollector_env
source appcollector_env/bin/activate
conda deactivate
```

> **⚠️ Warning:**
>
> If you change the name of the virtual environment, you must add the new name to the `.gitignore` file to ensure that the virtual environment directory is not tracked by version control.


The Python version used in this project is 3.10.12 and the pip version is 22.0.2 You can verify this with the commands:

```bash
python --version
pip --version
```

You need to configure the Python interpreter in PyCharm:

Navigate to: Python Interpreter -> Add Interpreter -> Virtualenv Environment -> Existing

Select the virtual environment created earlier.

To install the necessary dependencies, navigate to the root directory of the project (where 'requirements.txt' is stored) and execute:

```bash
pip install -r requirements.txt
```

If you run:

```bash
pip freeze
```

you should see the following output on the screen:

```bash
aiohappyeyeballs==2.4.3
aiohttp==3.10.10
aiosignal==1.3.1
alabaster==0.7.16
async-timeout==4.0.3
attrs==24.2.0
babel==2.16.0
beautifulsoup4==4.12.3
certifi==2024.8.30
charset-normalizer==3.3.2
click==8.1.7
colorama==0.4.6
dnspython==2.6.1
docutils==0.20.1
frozenlist==1.5.0
furo==2024.8.6
ghp-import==2.1.0
google-play-scraper==1.2.7
greenlet==3.0.3
griffe==1.5.1
idna==3.10
imagesize==1.4.1
Jinja2==3.1.4
Markdown==3.7
MarkupSafe==2.1.5
mergedeep==1.3.4
mkdocs==1.6.1
mkdocs-autorefs==1.2.0
mkdocs-get-deps==0.2.0
mkdocs-material==9.5.44
mkdocs-material-extensions==1.3.1
mkdocstrings @ git+https://github.com/mkdocstrings/mkdocstrings.git@e0af8006aeb51eeda5cbd54fdf44433199b2f81a
mkdocstrings-python==1.12.2
motor==3.6.0
multidict==6.1.0
packaging==24.1
paginate==0.5.7
pathspec==0.12.1
platformdirs==4.3.6
playwright==1.45.1
propcache==0.2.0
pyee==11.1.0
Pygments==2.18.0
pymdown-extensions==10.12
pymongo==4.9.1
python-dateutil==2.9.0.post0
PyYAML==6.0.2
pyyaml_env_tag==0.1
regex==2024.11.6
requests==2.32.3
six==1.16.0
snowballstemmer==2.2.0
soupsieve==2.5
Sphinx==8.0.2
sphinx-autodoc-typehints==2.4.4
sphinx-basic-ng==1.0.0b2
sphinxcontrib-applehelp==2.0.0
sphinxcontrib-devhelp==2.0.0
sphinxcontrib-htmlhelp==2.1.0
sphinxcontrib-jquery==4.1
sphinxcontrib-jsmath==1.0.1
sphinxcontrib-qthelp==2.0.0
sphinxcontrib-serializinghtml==2.0.0
tomli==2.0.2
typing_extensions==4.12.2
urllib3==2.2.3
watchdog==6.0.0
yarl==1.17.1
```

If you go back to the Python Interpreter settings in PyCharm, the same dependencies should be listed with the same version numbers.

## How it works

### Collecting Host Application Names and Packages

The first step is to obtain the names and package details of the desired host applications by running the **getHostAppsList.py** script, located in `sources/dataCollectors/hostAppsList`. Currently, this script is limited to collecting apps in the "social" category from the website [appbrain.com](https://www.appbrain.com). To expand or change the search criteria, simply modify the `appCategories` variable.
JSON files saved in the `results/hostAppsList` directory, with filenames based on the app category.
Collected data is saved in MongoDB in the `apks` collection.

### Collecting Host Application Metadata

The next step is to run the **getHostAppsMetadata.py** script to gather metadata for all applications stored in the MongoDB `apks` collection. Metadata is retrieved from the Google Play Store.
Each time a new APK version is detected, generic metadata for the APK is added to the `apks` collection, and version-specific data is recorded in the `versions` collection in MongoDB.

### Downloading Host Application APKs

The third step involves downloading each APK listed on [apkpure.com](https://apkpure.com). To do this, you need to run the **getHostApks.py** script, located in `sources/downloaders`.
This script downloads a maximum of 5 APKs each run. Downloaded APKs are stored in the NFS.

### Downloading TPL Directories

The TPL download process is similar to that of host applications. Start by running the **getTPLsDirectories.py** script in `sources/dataCollectors`. This script gathers the names of TPL directories from the [Maven repository](https://repo.maven.apache.org/maven2/).

### Collecting TPL Metadata

Run the **getTPLsMetadata.py** script, located in `sources/dataCollectors`, to download metadata for each TPL in the collected directories. For each TPL:
Generic TPL data is stored in the MongoDB `tpls` collection, while version-specific data is recorded in the `versions` collection.
On the first check, only the latest TPL version metadata is collected. In subsequent executions, the script checks for updates every two weeks. If a significant version (a major version increase) is detected, metadata is downloaded and saved.

### Downloading TPLs

The next step involves downloading each TPL. To do this, you need to run the **getTpls.py** script, located in `sources/downloaders`.
This script downloads a maximum of 100 TPLs each run. Downloaded TPLs are stored in the NFS.

### Logging

Logs for each process are stored in separate log folders corresponding to each script, facilitating easy tracking and debugging.

## Documentation 

Documentation for the scripts can be seen in the `site` folder. You need to open `index.html`.
