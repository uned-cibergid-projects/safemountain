from bs4 import BeautifulSoup
import time
from playwright.sync_api import sync_playwright
from bson.objectid import ObjectId

def scrollDownAndLoad(page, scrollPauseTime=1.0, maxScrolls=50):
    """
   Scrolls down the webpage incrementally to load dynamic content.

   :param page: The Playwright page object to interact with.
   :type page: playwright.sync_api.Page
   :param scrollPauseTime: Time to wait after each scroll, in seconds. Defaults to 1.0.
   :type scrollPauseTime: float
   :param maxScrolls: Maximum number of scroll actions to perform. Defaults to 50.
   :type maxScrolls: int
   :return: None
   :rtype: None
   """
    lastHeight = page.evaluate("document.body.scrollHeight")

    for _ in range(maxScrolls):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(scrollPauseTime)

        newHeight = page.evaluate("document.body.scrollHeight")

        if newHeight == lastHeight:
            break
        lastHeight = newHeight


def scrollUpUntilVisible(page, selector):
    """
    Scrolls up the webpage incrementally until the specified element becomes visible.

    :param page: The Playwright page object to interact with.
    :type page: playwright.sync_api.Page
    :param selector: The CSS selector of the element to make visible.
    :type selector: str
    :return: The Playwright element handle if found.
    :rtype: playwright.sync_api.ElementHandle
    :raises Exception: If the element with the specified selector is not visible after scrolling.
    """
    element = None

    while True:
        try:
            element = page.wait_for_selector(selector, timeout=2000, state='visible')
            if element:
                break
        except Exception:
            pass

        previousScrollPosition = page.evaluate("window.scrollY")

        page.evaluate("window.scrollBy(0, -10)")
        page.wait_for_timeout(1000)

        currentScrollPosition = page.evaluate("window.scrollY")

        if currentScrollPosition == previousScrollPosition:
            break

    if not element:
        raise Exception(f'The element with selector {selector} was not visible.')

    return element

def getPathUrlsAppbrain(url):
    """
    Extracts unique path URLs from the AppBrain page for a given application category.

    :param url: The URL of the AppBrain category page to scrape.
    :type url: str
    :return: A list of unique path URLs extracted from the page.
    :rtype: list[str]
    """
    html = getExpandedHtml(url)
    soup = BeautifulSoup(html, 'html.parser')

    pathUrls = []

    for wideContent in soup.find_all(class_="wide-content"):
        for link in wideContent.find_all('a', href=True):
            pathUrls.append(link['href'])

    pathUrls = list(set(pathUrls))

    return pathUrls

def getHrefs(url):
    """
    Retrieves all href attributes from anchor tags on the specified webpage.

    :param url: The URL of the webpage to scrape.
    :type url: str
    :return: A list of href links found on the page.
    :rtype: list[str]
    """
    html = getExpandedHtml(url)
    soup = BeautifulSoup(html, 'html.parser')

    hrefs = []

    for link in soup.find_all('a', href=True):
        hrefs.append(link['href'])

    return hrefs

def getExpandedHtml(url):
    """
    Fetches the fully rendered HTML content of a webpage by simulating a real browser.

    This function uses Playwright to launch a headless Chromium browser, navigates to the specified URL,
    performs scrolling to load dynamic content, and returns the rendered HTML.

    :param url: The URL of the webpage to retrieve.
    :type url: str
    :return: The rendered HTML content of the page as a string.
    :rtype: str
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled"
            ]
        )
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) '
                       'Chrome/112.0.0.0 Safari/537.36'
        )

        page = context.new_page()
        page.goto(url)
        scrollDownAndLoad(page)

        page.wait_for_timeout(5000)
        html = BeautifulSoup(page.content(), 'html.parser')
        browser.close()

        return str(html)

def reorderListId(list):
    """
    Reorders a list of dictionaries by converting ObjectId instances to strings and ensuring '_id' is the first key.

    :param list: The list of dictionaries to reorder.
    :type list: list[dict]
    :return: A new list with reordered dictionaries.
    :rtype: list[dict]
    """
    reorderedHostAppsList = []

    for element in list:

        if isinstance(element.get("_id"), ObjectId):
            element["_id"] = str(element["_id"])

        reorderedHostApp = {"_id": element["_id"]}
        reorderedHostApp.update(
            {fieldName: fieldValue for fieldName, fieldValue in element.items() if fieldName != "_id"})
        reorderedHostAppsList.append(reorderedHostApp)
    return reorderedHostAppsList