// Toolbar icon toggles the in-page panel; the panel asks us to open the manage page.
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'autosubmit:toggle' }).catch(() => {
    // Content script not available (chrome:// pages, Web Store, etc.) – open the manager instead.
    chrome.runtime.openOptionsPage();
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'autosubmit:openManage') chrome.runtime.openOptionsPage();
});
