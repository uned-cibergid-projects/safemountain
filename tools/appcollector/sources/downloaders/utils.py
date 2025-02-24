import logging
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from sources.logger import writeLog
import os

CHROMEDRIVER_PATH = './chromedriver'

def downloadHostApk(downloadUrl, hostAppName, apkSaveFolder):
    """
    Downloads an APK file for a host application from the specified download URL and saves it to the designated folder.

    :param downloadUrl: The URL from which to download the APK.
    :type downloadUrl: str
    :param hostAppName: The name of the host application, used to name the downloaded APK file.
    :type hostAppName: str
    :param apkSaveFolder: The directory path where the downloaded APK should be saved.
    :type apkSaveFolder: str
    :return: The version of the downloaded APK if successful; otherwise, `None`.
    :rtype: str or None
    :raises Exception: If the download link is not found or an unexpected error occurs during the download process.
    """
    with sync_playwright() as p:
        try:
            logger = logging.getLogger("logger")
            exceptionLogger = logging.getLogger("exceptionLogger")

            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-blink-features=AutomationControlled",
                    "--window-size=1920,1080",
                    "--start-maximized"
                ]
            )
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                           'AppleWebKit/537.36 (KHTML, like Gecko) '
                           'Chrome/112.0.0.0 Safari/537.36',
                locale='en-US',
                timezone_id='America/New_York',
                permissions=['geolocation'],
            )

            context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });

                window.navigator.chrome = {
                    runtime: {},
                };

                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });

                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });
            """)

            page = context.new_page()
            page.goto(downloadUrl, wait_until='networkidle')
            page.wait_for_timeout(2000)

            try:
                accept_button = page.query_selector('button.fc-primary-button')  # Example selector
                if accept_button:
                    accept_button.click()
                    writeLog("debug", logger, "Clicked the accept button on consent dialog.")
                    page.wait_for_timeout(1000)  # Wait a bit after clicking
            except Exception as e:
                writeLog("debug", logger, f"No consent dialog to handle: {e}")

            try:
                infoSdkDiv = page.query_selector('span.info-sdk')
                if infoSdkDiv:
                    versionSpan = infoSdkDiv.query_selector('span')
                    downloadedVersion = versionSpan.inner_text().strip() if versionSpan else "Unknown"
                else:
                    downloadedVersion = "Unknown"
            except Exception as e:
                writeLog("exception", exceptionLogger, f"Error extracting version from {downloadUrl}: {str(e)}")
                downloadedVersion = "Unknown"

            downloadButton = page.query_selector('a.download-btn')

            if not downloadButton:
                page.screenshot(path=os.path.join(apkSaveFolder, f"{hostAppName}_no_download_button.png"), full_page=True)
                raise Exception(f'Error downloading from: {downloadUrl}')

            with page.expect_download(timeout=60000) as download_info:
                try:
                    downloadButton.click()
                except Exception as e:
                    writeLog("exception", exceptionLogger, f"Error clicking download button: {str(e)}")
                    page.screenshot(path=os.path.join(apkSaveFolder, f"{hostAppName}_click_error.png"), full_page=True)
                    raise e

            try:
                downloadedApk = download_info.value
            except PlaywrightTimeoutError:
                writeLog("exception", exceptionLogger, f'Timeout while waiting for download from {downloadUrl}')
                page.screenshot(path=os.path.join(apkSaveFolder, f"{hostAppName}_download_timeout.png"), full_page=True)
                context.close()
                browser.close()
                return None

            if downloadedApk:

                savePath = os.path.join(apkSaveFolder, f"{hostAppName}.apk")

                downloadedApk.save_as(savePath)
                writeLog("debug", logger, f'APK successfully downloaded: {savePath}')

                context.close()
                browser.close()

                return downloadedVersion
            else:
                page.screenshot(path=os.path.join(apkSaveFolder, f"{hostAppName}_download_failed.png"), full_page=True)
                writeLog("exception", exceptionLogger, f'Failed to download APK from {downloadUrl}')
                context.close()
                browser.close()
                return None

        except Exception as e:
            if 'page' in locals():
                page.screenshot(path=os.path.join(apkSaveFolder, f"{hostAppName}_unexpected_error.png"), full_page=True)
            writeLog("exception", exceptionLogger, f'Unexpected error in downloadHostApk: {e}')
            return None
