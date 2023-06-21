const baseUrl = "https://beste.schule/students";

chrome.tabs.onUpdated.addListener(toggleStatus);
chrome.tabs.onRemoved.addListener(async function (tabId, removeInfo) {
    if (await checkIfTabExists(tabId)) {
        await removeTabFromStorage(tabId);
    }
});

async function toggleStatus(tabId, changeInfo) {
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        let url = tabs[0].url;

        if (changeInfo.url) {
            url = changeInfo.url;

            if (url.includes(baseUrl) && url.includes("grades")) {
                await toggleTabInjection(tabId);
            }
        } else {
            const injected = await checkIfTabIsInjected(tabId);
            if (injected) {
                await toggleTabInjection(tabId);
            }
        }

        if (changeInfo.status === "complete") {
            if (url.includes(baseUrl) && url.includes("grades")) {
                if (!await checkIfTabExists(tabId)) {
                    await addTabToStorage(tabId);
                }

                const injected = await checkIfTabIsInjected(tabId);
                if (!injected) {
                    await chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        files: ["content/content.js", "content/chart.js"],
                    });
        
                    const subjects = await fetchData(tabs[0].id);
                    await chrome.tabs.sendMessage(tabs[0].id, { message: "removeOldContent" });
                    await chrome.tabs.sendMessage(tabs[0].id, { message: "injectContent", subjects: subjects })

                    chrome.storage.local.set({ "subjects": subjects });
                    await toggleTabInjection(tabId);
                } else {
                    const subjects = await getSubjectsFromStorage();
                    await chrome.tabs.sendMessage(tabs[0].id, { message: "removeOldContent" });
                    await chrome.tabs.sendMessage(tabs[0].id, { message: "injectContent", subjects: subjects })
                }
            }
        }
    });
}

async function fetchData(id) {
    const response = await chrome.tabs.sendMessage(id, { message: "fetchData" });
    return response.subjects;
}

async function getSubjectsFromStorage() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get("subjects", function (data) {
            resolve(data.subjects ? data.subjects : []);
        });
    });
}

async function createTabsInStorage() {
    chrome.storage.local.set({ "tabs": [] });
}

async function getTabsFromStorage() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get("tabs", function (data) {
            if (data.tabs) {
                resolve(data.tabs);
            } else {
                createTabsInStorage();
                resolve([]);
            }
        });
    });
}

async function addTabToStorage(tabId) {
    const tabs = await getTabsFromStorage();
    tabs.push({ id: tabId, injected: false });
    chrome.storage.local.set({ "tabs": tabs });
}

async function checkIfTabExists(tabId) {
    const tabs = await getTabsFromStorage();
    return tabs.some(tab => tab.id === tabId);
}

async function removeTabFromStorage(tabId) {
    const tabs = await getTabsFromStorage();
    const index = tabs.findIndex(tab => tab.id === tabId);
    tabs.splice(index, 1);
    chrome.storage.local.set({ "tabs": tabs });
}

async function checkIfTabIsInjected(tabId) {
    const tabs = await getTabsFromStorage();
    const tab = tabs.find(tab => tab.id === tabId);
    if (tab) {
        return tab.injected;
    }
    return false;
}

async function toggleTabInjection(tabId) {
    const tabs = await getTabsFromStorage();
    const tab = tabs.find(tab => tab.id === tabId);
    if (tab) {
        tab.injected = !tab.injected;
        chrome.storage.local.set({ "tabs": tabs });
    }
}