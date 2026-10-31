// ===== 原生 IndexedDB 初始化（无需任何外部库） =====
var dbPromise = new Promise(function(resolve, reject) {
  var req = indexedDB.open('MindAppDB', 2);
  req.onupgradeneeded = function(e) {
    var db = e.target.result;
    if (!db.objectStoreNames.contains('stateStore')) {
      db.createObjectStore('stateStore');
    }
    if (!db.objectStoreNames.contains('stickerStore')) {
      db.createObjectStore('stickerStore');
    }
  };
  req.onsuccess = function(e) { resolve(e.target.result); };
  req.onerror = function(e) { reject(e.target.error); };
});


// 检测URL参数
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('action') === 'call') {
  setTimeout(() => triggerCall(), 500);
}

// 日记的天气/心情预设
var WEATHERS = ['晴朗', '多云', '阴天', '小雨', '中雨', '大雨', '暴雨', '小雪', '中雪', '大雪', '暴雪', '雾霾', '大风', '冰雹', '彩虹'];
var MOODS = ['开心', '难过', '生气', '平静', '冷静', '无聊', '焦虑', '兴奋', '害羞', '期待', '疲惫', '感动', '心慌', '幸福', '孤单'];


// ===== STATE =====

let state = {
    gomokuAiMatches: [], // 正在进行的AI对战
  profile: { avatar: '', name: '我', status: '在线' },
  dreams: [],
  groups: [],
  currentEditDreamId: null,
    categories: [{ id: 'default', name: '默认' }],
  cards: [], // 👈 改成空数组
  activeCalls: [], // 所有正在进行的通话（包括AI发起的）
  chatCustomStyles: {}, // 存放每个聊天的专属 CSS
  settings: { callBg: null, checkinBg: null, pushEnabled: false, customIcons: {}, currentStickerGroupId: 'default' },
  callState: 'idle',
  callTimerInterval: null,
  callStartTime: null,
  callElapsed: 0,
  nextCallId: 0,
  nextCheckinId: 0,
    chatSessions: {}, // 存放每个梦角的聊天记录
  currentChatId: null, // 当前正在和谁聊天
    appPages: null,
   diaries: [],
  userDiaryLastDate: '',
    giftItems: null,
      workShifts: [],   // 所有梦角的打工记录
        bannedDreams: [],         // 被封禁的梦角 [{ dreamId, until }]
  apologizingDreams: [],    // 强制道歉的梦角 [{ dreamId, until }]
  cheatUsage: { date: '', unbanGroups: [], seizeGroups: [] },  // 外挂使用记录
  musicLibrary: {
    songs: [],
    playlists: []
  },
  widgets: [],
  memos: [],
  quizQuestions: [],
  quizGroups: [],
  quizMeQuestions: [],
  quizMeGroups: [],
  quizHistory: [],
  avatarLibrary: [],
  lastAvatarScan: 0,
  dreamRecall: { records: [] },
  dreamRecallDone: {},
    customStickers: {},
  extraCategories: [],
  gomokuHistory: [],
  tttAiMatches: [],
};

// ===== 图标配置 =====
const ICONS_CONFIG = [
  // ==== 第一页 ====
  { key: 'pageWeChat', name: '聊天', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' },
  { key: 'pageWordCards', name: '字卡功能', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>' },
  { key: 'pageBeautify', name: '外观美化', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' },
  { key: 'pageSettings', name: '设置', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
  { key: 'pageMailbox', name: '信箱', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' },
  { key: 'pageStickers', name: '表情包', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' },
  { key: 'pageQuiz', name: '问卷', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>' },
  { key: 'pageMemoList', name: '日历', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },

  // ==== 第二页 ====
  { key: 'pageDreamRecall', name: '梦境', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' },
  { key: 'pageMusic', name: '音乐', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
  { key: 'pageNote', name: '小纸条', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/></svg>' },
  { key: 'pageNotebook', name: '手账', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z"/><line x1="8" y1="4" x2="8" y2="22"/><line x1="12" y1="9" x2="16" y2="9"/><line x1="12" y1="13" x2="16" y2="13"/></svg>' },
  { key: 'pageWork', name: '打工', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' },
  { key: 'pageGame', name: '小游戏', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4"/><circle cx="16" cy="12" r="1"/><circle cx="18" cy="14" r="1"/></svg>' },
];

// ===== 1. 渲染主页图标 =====
var APP_PER_PAGE = 24; // 每页 4×6
var MIN_APP_PAGES = 2; 

function initAppPages() {
  // 严格按照用户的图纸进行 null 占位（4列 x 6行 = 24格）
  // 第一页：第1、2行全空，第3、4行是图标，第5、6行全空
    var page1 = [
    null, null, null, null,          // 第1行 (时间组件)
    null, null, null, null,          // 第2行 (时间组件)
    'pageWeChat', 'pageWordCards', 'pageBeautify', 'pageSettings', // 第3行
    'pageMailbox', 'pageStickers', 'pageQuiz', 'pageMemoList',      // 第4行
    null, null, null, null,          // 第5行 (拍立得占左侧两格)
    null, null, null, null           // 第6行 (拍立得占左侧两格)
  ];

  // 第二页：第1行图标，第2、3行空，第4行图标，第5、6行空
  var page2 = [
    'pageDreamRecall', 'pageMusic', 'pageNote', 'pageNotebook', // 第1行
    null, null, null, null,          // 第2行空
    null, null, null, null,          // 第3行空
    'pageWork', 'pageGame', 'pageDessert', null , // 第4行
    null, null, null, null,          // 第5行空
    null, null, null, null           // 第6行空
  ];
  
  state.appPages = [page1, page2];
  saveState();
}

function renderAppIcons() {
  initAppPages();
  var home = document.getElementById('pageHome');
  if (!home) return;

    // 清理掉旧的废弃空网格，防止顶部出现大块空白
  var oldGrid = document.getElementById('homeAppGrid');
  if (oldGrid) oldGrid.remove();

  // 1. 查找是否已经有滑动容器，没有才创建（首次加载时）
  var container = document.getElementById('homeSwiper');
  if (!container) {
    container = document.createElement('div');
    container.id = 'homeSwiper';
    container.style.cssText = 'display:flex;width:100%;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;';
    container.style.scrollbarWidth = 'none';
    home.appendChild(container);
  }

  // 2. 只清空容器里面的页面，保留容器本身（这样滚动位置就不会丢）
  container.innerHTML = '';

  state.appPages.forEach(function(pageKeys, pageIdx) {
    var page = document.createElement('div');
    page.className = 'app-grid';
    page.dataset.pageIndex = pageIdx;
    page.style.cssText = 'flex-shrink:0;width:100%;scroll-snap-align:start;';

    for (var slot = 0; slot < 24; slot++) {
      
      // 【第一页小组件】
      if (pageIdx === 0 && slot === 18) {
        injectSayWidget(page);
        continue;
      }
      if (pageIdx === 0 && (slot === 19 || slot === 22 || slot === 23)) {
        continue;
      }

      // 【第一页时间组件】
      if (pageIdx === 0 && slot === 0) {
        injectAnniversaryWidget(page);
        continue;
      }
      if (pageIdx === 0 && slot >= 1 && slot <= 7) {
        continue;
      }

      // 【第一页拍立得】
      if (pageIdx === 0 && slot === 16) {
        injectPolaroidWidget(page);
        continue;
      }
      if (pageIdx === 0 && slot > 16 && slot < 24) {
        continue;
      }

      // 【第二页纪念日组件】
      if (pageIdx === 1 && slot === 4) {
        injectFriendWidget(page);
        continue;
      }
      if (pageIdx === 1 && slot >= 5 && slot <= 11) {
        continue;
      }

            // 【第二页音乐播放器组件】
      if (pageIdx === 1 && slot === 16) {
        injectMusicWidget(page);
        continue;
      }
      if (pageIdx === 1 && slot >= 17 && slot <= 23) {
        continue;
      }

      var key = pageKeys[slot];
      
      if (!key) {
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'app-icon-slot';
        emptyDiv.style.cssText = 'width:100%;height:82px;visibility:hidden;'; 
        page.appendChild(emptyDiv);
        continue;
      }

      var item = ICONS_CONFIG.find(function(x) { return x.key === key; });
      if (!item) continue;

      var customIcon = state.settings.customIcons && state.settings.customIcons[item.key];
      
      var iconDiv = document.createElement('div');
      iconDiv.className = 'app-icon';
      iconDiv.dataset.appKey = key;
      iconDiv.onclick = function() {
        navigateTo(this.dataset.appKey);
      };

      var imgDiv = document.createElement('div');
      imgDiv.className = 'app-icon-img';
      if (customIcon) {
        imgDiv.innerHTML = '<img src="' + customIcon + '" style="width:100%;height:100%;object-fit:contain;">';
      } else {
        imgDiv.innerHTML = item.svg;
      }

      var textDiv = document.createElement('div');
      textDiv.className = 'app-icon-text';
      textDiv.textContent = item.name;

      iconDiv.appendChild(imgDiv);
      iconDiv.appendChild(textDiv);
      page.appendChild(iconDiv);
    }

    container.appendChild(page);
  });

  // 3. 处理底部小圆点
  var pager = document.getElementById('homePager');
  if (state.appPages.length > 1) {
    if (!pager) {
      pager = document.createElement('div');
      pager.id = 'homePager';
      pager.style.cssText = 'display:flex;justify-content:center;gap:6px;padding:12px 0;flex-shrink:0;';
      home.appendChild(pager);
    }
    
    // 获取当前页（防止重绘后红点不对）
    var currentIdx = Math.round(container.scrollLeft / container.offsetWidth) || 0;
    
    pager.innerHTML = '';
    state.appPages.forEach(function(_, idx) {
      var dot = document.createElement('span');
      dot.dataset.pageDot = idx;
      dot.style.cssText = 'width:7px;height:7px;border-radius:50%;background:' + (idx === currentIdx ? 'var(--blue)' : 'rgba(0,0,0,0.15)') + ';transition:background 0.2s;';
      pager.appendChild(dot);
    });
  } else if (pager) {
    pager.remove();
  }

  // 4. 绑定滚动事件（只绑定一次，防止重复卡顿）
  if (!container._scrollBound) {
    container._scrollBound = true;
    container.addEventListener('scroll', function() {
      var idx = Math.round(container.scrollLeft / container.offsetWidth);
      var pagerEl = document.getElementById('homePager');
      if (pagerEl) {
        var dots = pagerEl.querySelectorAll('span');
        dots.forEach(function(d, i) {
          d.style.background = (i === idx) ? 'var(--blue)' : 'rgba(0,0,0,0.15)';
        });
      }
    });
  }
}

// ===== 2. 渲染美化页的图标设置面板 =====
function renderIconSettings() {
  const grid = document.getElementById('iconSettingsGrid');
  if (!grid) return;
  grid.innerHTML = ICONS_CONFIG.map(item => {
    const customIcon = state.settings.customIcons && state.settings.customIcons[item.key];
          return `
      <div class="icon-setting-item">
        <div class="icon-setting-preview" style="background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;">
          ${customIcon ? `<img src="${customIcon}" style="width:100%;height:100%;border-radius:10px;object-fit:cover;">` : `<span style="display:flex;width:24px;height:24px;">${item.svg}</span>`}
        </div>
        <div class="icon-setting-name">${item.name}</div>
        <label class="icon-setting-btn">
          上传
          <input type="file" accept="image/*" style="display:none" onchange="handleIconUpload(event, '${item.key}')">
        </label>
      </div>
    `;
  }).join('');
}

// ===== INIT =====
async function init() {
  await loadState(); 
    // 给所有梦角补上 balance 字段
  if (state.dreams && Array.isArray(state.dreams)) {
      if (!state.giftItems || !Array.isArray(state.giftItems) || state.giftItems.length === 0) {
    state.giftItems = [
      { id: 'gift_1', name: '蛋糕', price: 5 },
      { id: 'gift_2', name: '花',   price: 10 },
      { id: 'gift_3', name: '奶茶', price: 15 }
    ];
  }
    state.dreams.forEach(function(d) {
      if (d.balance == null) d.balance = 0;
      if (!d.statuses || !Array.isArray(d.statuses)) d.statuses = [];
      if (d.currentStatus === undefined) d.currentStatus = '';
      if (d.statusUpdateAt === undefined) d.statusUpdateAt = 0;
    });
  }
  loadChatMessages();
  renderChatMessages();
  renderAll();
  renderAppIcons();
  renderIconSettings();  
  updateTime();
  setInterval(updateTime, 1000);
  startRandomEvents();
  setInterval(checkAutoMessage, 30000);
  setupPush();
  setupChatBg();
  applyBeautySettings();
  initSpeedSettings();
  checkAutoDiary();
    setInterval(checkAutoCommentOnDiary, 10 * 60 * 1000);
  applyHomeBg();
  applyGlobalWallpaper();
  initGlobalSettingsUI();
    checkMailDelivery();
  setInterval(checkMailDelivery, 30000);
  checkAutoLetter();
setInterval(checkAutoLetter, 6 * 60 * 60 * 1000);
    checkRedPacketExpiry();
  setInterval(checkRedPacketExpiry, 5 * 60 * 1000);
    startWorkSystem();
      checkAssistantExpiry();
  setInterval(checkAssistantExpiry, 30000);
  startDreamStatusTicker();
  initQuizData();
  initAvatarData();
  checkAvatarRandomChange();
  setInterval(checkAvatarRandomChange, 5 * 60 * 1000);
   updateAppIconBadges();
  setInterval(updateAppIconBadges, 15000);

    // 启动桌面小纸条组件字卡检测
  checkSayWidgetCardUpdate();
  setInterval(checkSayWidgetCardUpdate, 5 * 60 * 1000);

  // WebView 加载时宽度是渐变的，多次重渲染保证小组件正确
  [200, 600, 1500, 3000, 5000, 8000].forEach(function(d) {
    setTimeout(function() {
      try { renderAppIcons(); } catch(e) {}
    }, d);
  });

    // 小组件加载时机容错（防止 WebView 加载时错位）
  [100, 300, 800, 1500, 3000].forEach(function(delay) {
    setTimeout(function() {
      try { renderAppIcons(); } catch(e) {}
    }, delay);
  });

  // 注册 Service Worker（PWA）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function(e) {
      console.log('SW 注册失败：', e);
    });
  }
    initCardSearchEvent();
      setInterval(updateDiaryBadges, 5000); // 每5秒检查一次朋友圈未读

        // 👇 手账自动创作检查
  setTimeout(checkAutoScrapbook, 3000);           // 启动 3 秒后先检查一次
  setInterval(checkAutoScrapbook, 60 * 60 * 1000); // 之后每小时检查一次
}

// ===== PERSISTENCE =====
function saveState() {
  var data = JSON.stringify(state);
  dbPromise.then(function(db) {
    var tx = db.transaction('stateStore', 'readwrite');
    tx.objectStore('stateStore').put(data, 'dreamCheckState');
  }).catch(function(e) {
    console.error('IndexedDB 保存失败，尝试回退到 localStorage', e);
    try { localStorage.setItem('dreamCheckState', data); } catch(err) {}
  });
}

function loadState() {
  return dbPromise.then(function(db) {
    return new Promise(function(resolve) {
      var tx = db.transaction('stateStore', 'readonly');
      var req = tx.objectStore('stateStore').get('dreamCheckState');
      req.onsuccess = function(e) {
        var saved = e.target.result;
        if (!saved) {
          // 如果 IndexedDB 没数据，尝试从旧的 localStorage 迁移
          var oldData = localStorage.getItem('dreamCheckState');
          if (oldData) {
            saved = oldData;
            // 迁移到 IndexedDB 并清空 localStorage
            var tx2 = db.transaction('stateStore', 'readwrite');
            tx2.objectStore('stateStore').put(saved, 'dreamCheckState');
            localStorage.removeItem('dreamCheckState');
          }
        }
        if (saved) {
          try {
            var parsed = JSON.parse(saved);
            if (parsed.profile) state.profile = parsed.profile;
            if (parsed.dream) state.dream = parsed.dream;
            if (parsed.dreams) state.dreams = parsed.dreams;
            if (parsed.groups) state.groups = parsed.groups;
            if (parsed.chatSessions) state.chatSessions = parsed.chatSessions;
            if (parsed.currentChatId) state.currentChatId = parsed.currentChatId;
            if (parsed.categories) state.categories = parsed.categories;
            if (parsed.cards) state.cards = parsed.cards;
            if (parsed.settings) state.settings = parsed.settings;
            if (parsed.schedules) state.schedules = parsed.schedules;
            if (parsed.calendarTypes) state.calendarTypes = parsed.calendarTypes;
            if (parsed.nextCallId) state.nextCallId = parsed.nextCallId;
            if (parsed.nextCheckinId) state.nextCheckinId = parsed.nextCheckinId;
            if (parsed.pokes) state.pokes = parsed.pokes;
            if (parsed.diaries) state.diaries = parsed.diaries;
            if (parsed.favorites) state.favorites = parsed.favorites;
            if (parsed.anniversaries) state.anniversaries = parsed.anniversaries;
            if (parsed.mails) state.mails = parsed.mails;
            if (parsed.mutedChats) state.mutedChats = parsed.mutedChats;
            if (parsed.lastReadAt) state.lastReadAt = parsed.lastReadAt;
            if (parsed.lastActivityAt) state.lastActivityAt = parsed.lastActivityAt;
            if (parsed.lastReadDiaryPostTime) state.lastReadDiaryPostTime = parsed.lastReadDiaryPostTime;
            if (parsed.lastReadDiaryInteractionTime) state.lastReadDiaryInteractionTime = parsed.lastReadDiaryInteractionTime;
            if (parsed.compSelectedDreamId) state.compSelectedDreamId = parsed.compSelectedDreamId;
            if (parsed.userDiaryLastDate) state.userDiaryLastDate = parsed.userDiaryLastDate;
            if (parsed.appPages) state.appPages = parsed.appPages;
            if (parsed.workShifts) state.workShifts = parsed.workShifts;
            if (parsed.bannedDreams) state.bannedDreams = parsed.bannedDreams;
            if (parsed.apologizingDreams) state.apologizingDreams = parsed.apologizingDreams;
            if (parsed.cheatUsage) state.cheatUsage = parsed.cheatUsage;
            if (parsed.musicLibrary) state.musicLibrary = parsed.musicLibrary;
            if (parsed.giftItems) state.giftItems = parsed.giftItems;
            if (parsed.memos) state.memos = parsed.memos;
            if (parsed.quizQuestions) state.quizQuestions = parsed.quizQuestions;
            if (parsed.quizGroups) state.quizGroups = parsed.quizGroups;
            if (parsed.quizMeGroups) state.quizMeGroups = parsed.quizMeGroups;
            if (parsed.quizMeQuestions) state.quizMeQuestions = parsed.quizMeQuestions;
            if (parsed.quizHistory) state.quizHistory = parsed.quizHistory;
            if (parsed.avatarLibrary) state.avatarLibrary = parsed.avatarLibrary;
            if (parsed.lastAvatarScan) state.lastAvatarScan = parsed.lastAvatarScan;
            if (parsed.dreamRecall) state.dreamRecall = parsed.dreamRecall;
            if (parsed.dreamRecallDone) state.dreamRecallDone = parsed.dreamRecallDone;
            if (parsed.paperRounds) state.paperRounds = parsed.paperRounds;
            if (parsed.paperHistory) state.paperHistory = parsed.paperHistory;
            if (parsed.currentPaperDreamId) state.currentPaperDreamId = parsed.currentPaperDreamId;
            if (parsed.scrapbooks) state.scrapbooks = parsed.scrapbooks;
            if (parsed.customStickers) state.customStickers = parsed.customStickers;
            if (parsed.extraCategories) state.extraCategories = parsed.extraCategories;
            if (parsed.gomokuHistory) state.gomokuHistory = parsed.gomokuHistory;
            if (parsed.perlerData) state.perlerData = parsed.perlerData;
          } catch(err) {}
        }
        resolve();
      };
      req.onerror = function() {
        resolve();
      };
    });
  }).catch(function() {
    // 如果整个数据库都打不开，退回 localStorage 读取
    var saved = localStorage.getItem('dreamCheckState');
    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        if (parsed.profile) state.profile = parsed.profile;
        if (parsed.dream) state.dream = parsed.dream;
        if (parsed.dreams) state.dreams = parsed.dreams;
        // ... (为了简洁，这里用同样的方式把剩下的字段读一遍) ...
      } catch(e) {}
    }
  });
}

// ===== TIME =====
function updateTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  document.getElementById('statusTime').textContent = h + ':' + m;
}

// ===== 微信 Tab 切换 =====
function switchWeChatTab(tab) {
  document.querySelectorAll('.wechat-tab-content').forEach(function(el) {
    el.style.display = 'none';
  });
  
  var tabs = ['chat', 'contacts', 'discover', 'me'];
  tabs.forEach(function(t) {
    var el = document.getElementById('navTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (el) el.style.color = '#86868b';
  });
  
  var targetTab = document.getElementById('wechatTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (targetTab) targetTab.style.display = 'flex';
  
  var activeEl = document.getElementById('navTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (activeEl) activeEl.style.color = '#07c160';
  
  // 强制渲染数据
  if (tab === 'chat') { try { renderChatList(); } catch(e){} }
  if (tab === 'contacts') { try { renderDreamRoles(); } catch(e){} }
      if (tab === 'discover') { 
    window._currentDiaryTabIsActive = true; 
     state.lastReadDiaryPostTime = Date.now(); 
    saveState();
    try { 
      renderDiaryCover(); 
      renderDiaryList(); 
      updateDiaryBadges(); // 进来先更新一下横幅，但不要立刻标记已读！
    } catch(e){} 
  } else {
    window._currentDiaryTabIsActive = false;
    // 离开朋友圈时，如果有新消息，可以考虑标记已读（或者你想让它一直留着也行）
    // 这里我们保留红点，等用户下次点横幅再消除
    updateDiaryBadges();
  }
  if (tab === 'me') {
    var avatarEl = document.getElementById('wechatAvatar');
    var nameEl = document.getElementById('wechatName');
    var statusEl = document.getElementById('wechatStatus');
    if (avatarEl) avatarEl.src = state.profile.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2780%27 height=%2780%27 viewBox=%270 0 80 80%27%3E%3Ccircle cx=%2740%27 cy=%2740%27 r=%2740%27 fill=%27%23e8e8ed%27/%3E%3Ctext x=%2740%27 y=%2744%27 text-anchor=%27middle%27 fill=%27%2386868b%27 font-size=%2728%27%3E👤%3C/text%3E%3C/svg%3E';
    if (nameEl) nameEl.textContent = state.profile.name || '我';
    if (statusEl) statusEl.textContent = state.profile.status || '在线';
  }
}

// ===== NAVIGATION =====
function navigateTo(pageId) {

  // 拦截未开发的页面...（下面保持原样）
  var devPages = ['pageNotebook', 'pageDessert'];

  // 1. 先隐藏所有页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  // 2. 如果是主页，直接显示
  if (pageId === 'pageHome') {
    document.querySelector('.main-content').style.display = 'block';
    try { updateAppIconBadges(); } catch(e) {}
    return;
  }
  
  // 3. 隐藏主页
  document.querySelector('.main-content').style.display = 'none';
  
  // 4. 找页面
  var page = document.getElementById(pageId);
  if (!page) {
    console.error('致命错误：找不到页面 [', pageId, ']，请检查 HTML 里是否有这个 id！');
    document.querySelector('.main-content').style.display = 'block';
    return;
  }
  
  // 5. 显示页面
  page.classList.add('active');
  
  // 6. 触发渲染逻辑（全部加上 try-catch，防止一个报错全盘崩溃）
  try {
    if (pageId === 'pageWordCards') renderWordCards();
    if (pageId === 'pageStickers') renderStickerGroups();
    if (pageId === 'pageWork') renderWorkCards();
    if (pageId === 'pageMusic') renderMusicList();
    if (pageId === 'pageProfile') loadProfileForm();
    if (pageId === 'pageDreamRole') renderDreamRoles();
    if (pageId === 'pageChatList') renderChatList();
    if (pageId === 'pageMailbox') { switchMailTab('inbox'); renderMailList(); }
    if (pageId === 'pageFavorites') renderFavorites();
    if (pageId === 'pageDiary') { renderDiaryCover(); renderDiaryList(); }
    if (pageId === 'pageDreamRecall') { window._drSelectedId = null; window._drStep = 'select'; renderDreamRecall(); }
    if (pageId === 'pageQuiz') switchQuizTab('dream');
    if (pageId === 'pageMemoList') renderMemoList();
    if (pageId === 'pageAvatar') { window._avatarEditMode = false; window._avatarSelected = []; renderAvatarLib(); }
    if (pageId === 'pageIconSettings') renderIconSettings();
    if (pageId === 'pagePrivateChat') { loadChatMessages(); renderChat(); }
    if (pageId === 'pageCreateGroup') createGroupChat();
    if (pageId === 'pageGroupSettings') renderGroupSettings();
    if (pageId === 'pageAnniversaryWidgetEdit') openAnniversaryWidgetEdit();
    if (pageId === 'pageSayWidgetEdit') initSayWidgetEdit();
    if (pageId === 'pageChatSetting') initChatSetting();
    if (pageId === 'pageFriendWidgetEdit') openFriendWidgetEdit();
    if (pageId === 'pageMusicWidgetEdit') openMusicWidgetEdit();
    if (pageId === 'pageNote') renderPaperPage();
  } catch (err) {
    console.error('页面渲染出错：', pageId, err);
    // 即使报错，也让页面显示出来（可能只是没数据，但至少有框架）
  }
}

// ===== PROFILE =====
function loadProfileForm() {
  var nameEl = document.getElementById('profileName');
  var statusEl = document.getElementById('profileStatus');
  var previewEl = document.getElementById('profileAvatarPreview');
  
  if (nameEl) nameEl.value = state.profile.name || '我';
  if (statusEl) statusEl.value = state.profile.status || '在线';
  if (previewEl && state.profile.avatar) {
    previewEl.src = state.profile.avatar;
  }
}

function handleProfileAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    state.profile.avatar = ev.target.result;
    document.getElementById('profileAvatarPreview').src = ev.target.result;
    saveState();
    try { renderDiaryCover(); } catch(e) {}
    showToast('头像已更新');
  };
  reader.readAsDataURL(file);
}

function saveProfile() {
  state.profile.name = document.getElementById('profileName').value || '我';
  state.profile.status = document.getElementById('profileStatus').value || '在线';
  saveState();
  try { renderDiaryCover(); } catch(e) {}
  showToast('个人资料已保存');
}

// ===== DREAM ROLE =====
// ===== 梦角列表渲染 =====
function renderDreamRoles() {
  var container = document.getElementById('dreamListContainer');
  if (!container) return;
  
  // 如果没有梦角数据，就保持空数组，不生成预设角色
  if (!state.dreams) {
    state.dreams = [];
    saveState();
  }

  if (state.dreams.length === 0) {
    container.innerHTML = '<div style="padding:60px 20px;text-align:center;color:#86868b;font-size:14px;">通讯录空空如也<br>点右上角 + 添加一个梦角吧</div>';
    return;
  }

  container.innerHTML = state.dreams.map(function(d) {
    var avatar = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2780%27 height=%2780%27 viewBox=%270 0 80 80%27%3E%3Ccircle cx=%2740%27 cy=%2740%27 r=%2740%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2740%27 y=%2744%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2728%27%3E💜%3C/text%3E%3C/svg%3E';
    return `
      <div class="contact-item" onclick="openEditDreamRole('${d.id}')">
        <img class="contact-avatar" src="${avatar}">
        <div class="contact-info">
          <div class="contact-name">${d.name || '未命名'}</div>
          <div class="contact-desc">点击编辑信息</div>
        </div>
      </div>
    `;
  }).join('');
}

// 新增梦角
function addDreamRole() {
  window._isNewDream = true;
  state.currentEditDreamId = null;
  
  document.getElementById('editDreamTitle').textContent = '新增梦角';
  document.getElementById('dreamName').value = '';
  document.getElementById('dreamGender').value = '男';
  document.getElementById('dreamAvatarPreview').src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2780%27 height=%2780%27 viewBox=%270 0 80 80%27%3E%3Ccircle cx=%2740%27 cy=%2740%27 r=%2740%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2740%27 y=%2744%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2728%27%3E💜%3C/text%3E%3C/svg%3E';
  
  window._dreamStatusCollapsed = true;
  window._tempStatuses = []; // 用一个临时数组存状态
  renderDreamStatusList();
  navigateTo('pageEditDreamRole');
}

// 打开编辑页
function openEditDreamRole(id) {
  window._isNewDream = false;
  state.currentEditDreamId = id;
  var d = state.dreams.find(function(item) { return item.id === id; });
  if (!d) return;
  
  document.getElementById('editDreamTitle').textContent = '编辑：' + d.name;
  document.getElementById('dreamName').value = d.name || '';
  document.getElementById('dreamGender').value = d.gender || '男';
  
  if (d.avatar) {
    document.getElementById('dreamAvatarPreview').src = d.avatar;
  } else {
    document.getElementById('dreamAvatarPreview').src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2780%27 height=%2780%27 viewBox=%270 0 80 80%27%3E%3Ccircle cx=%2740%27 cy=%2740%27 r=%2740%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2740%27 y=%2744%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2728%27%3E💜%3C/text%3E%3C/svg%3E';
  }
  
  window._dreamStatusCollapsed = true;
  window._tempStatuses = d.statuses ? d.statuses.slice() : []; // 拷贝一份出来
  renderDreamStatusList();
  navigateTo('pageEditDreamRole');
}

// 处理头像上传（带压缩）
function handleDreamAvatar(e) {
  const file = e.target.files[0];
  if (!file) return; // 只要选了文件，就放行
  
  const reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX_SIZE = 200;
      var width = img.width;
      var height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
      } else {
        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
      }
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      var compressedDataUrl = canvas.toDataURL('image/png');
      
      // 1. 无论新建还是编辑，先让界面上的头像变过来
      document.getElementById('dreamAvatarPreview').src = compressedDataUrl;
      
      // 2. 如果是编辑模式，顺便把数据存进去
      if (state.currentEditDreamId) {
        var d = state.dreams.find(function(item) { return item.id === state.currentEditDreamId; });
        if (d) {
          d.avatar = compressedDataUrl;
          saveState();
        }
      }
      // 新建模式下，图片数据已经在预览框里了，点保存时 saveDreamRole 会自动读取它。
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// 保存梦角
function saveDreamRole() {
  var name = document.getElementById('dreamName').value || '未命名';
  var gender = document.getElementById('dreamGender').value || '男';
  var avatar = document.getElementById('dreamAvatarPreview').src;
  
  if (window._isNewDream) {
    // 新建
    var newId = 'dream_' + Date.now();
    state.dreams.push({ 
      id: newId, 
      name: name, 
      gender: gender, 
      avatar: avatar, 
      balance: 0,
      statuses: window._tempStatuses || []
    });
    window._isNewDream = false;
  } else {
    // 编辑已有
    var d = state.dreams.find(function(item) { return item.id === state.currentEditDreamId; });
    if (d) {
      d.name = name;
      d.gender = gender;
      d.avatar = avatar;
      d.statuses = window._tempStatuses || d.statuses;
    }
  }
  
  saveState();
  showToast('梦角信息已保存');
  navigateTo('pageWeChat'); switchWeChatTab('contacts');
}

// 删除梦角
function deleteDreamRole() {
  if (!state.currentEditDreamId) return;
  if (!confirm('确定要删除这个梦角吗？聊天记录也会一并删除哦！')) return;
  
  state.dreams = state.dreams.filter(function(item) { return item.id !== state.currentEditDreamId; });
  if (state.workShifts && state.workShifts.length > 0) {
    state.workShifts = state.workShifts.filter(function(w) { return w.dreamId !== state.currentEditDreamId; });
  }
  state.currentEditDreamId = null;
  saveState();
  showToast('梦角已删除');
  navigateTo('pageWeChat'); switchWeChatTab('contacts'); // 改这里！
}

// ===== WORD CARDS =====
// ===== 替换 renderWordCards 函数 =====
// 获取所有可用字卡（未被屏蔽）
function getUsableCards(targetDreamId) {
  return (state.cards || []).filter(function(c) {
    // 必须没有被屏蔽
    if (!isCardUsable(c)) return false;
    
    var owner = c.dreamId || 'all';
    // 如果是通用字卡，或者归属匹配当前的梦角，则可用
    if (owner === 'all') return true;
    if (targetDreamId && owner === targetDreamId) return true;
    
    return false;
  });
}

// 根据拼接设置生成梦角要发送的文字
function buildCardText(availableCards) {
  if (!availableCards || availableCards.length === 0) return '…';
  var s = state.settings || {};
  var useJoin = !!s.cardJoinEnabled;
  var minN = Math.max(1, Math.min(7, parseInt(s.cardJoinMin) || 1));
  var maxN = Math.max(minN, Math.min(7, parseInt(s.cardJoinMax) || 1));
  var count = 1;
  if (useJoin) {
    count = minN + Math.floor(Math.random() * (maxN - minN + 1));
    if (count > availableCards.length) count = availableCards.length;
  }
  var shuffled = availableCards.slice().sort(function() { return Math.random() - 0.5; });
  var picked = shuffled.slice(0, count);
  var texts = picked.map(function(c) { return c.text; }).filter(function(t) { return t; });
  if (texts.length === 0) return '…';
  return texts.join('，');
}

window._currentCardOwner = 'all'; // 默认显示通用字卡

function switchCardOwner(val) {
  window._currentCardOwner = val;
  renderWordCards();
}

function renderWordCards() {
  var container = document.getElementById('wordCardsContainer');
  var ownerSelect = document.getElementById('cardOwnerSelect');
  if (!container) return;

  // 1. 渲染归属下拉框
  if (ownerSelect) {
    var html = '<option value="all">通用（所有梦角）</option>';
    if (state.dreams) {
      state.dreams.forEach(function(d) {
        html += '<option value="' + d.id + '">' + d.name + ' 专属</option>';
      });
    }
    ownerSelect.innerHTML = html;
    ownerSelect.value = window._currentCardOwner || 'all';
  }

  // 2. 获取数据
  var currentOwner = window._currentCardOwner || 'all';
  var filteredCards = state.cards.filter(function(c) {
    return (c.dreamId || 'all') === currentOwner;
  });
  var filteredCats = state.categories.filter(function(c) {
    return (c.dreamId || 'all') === currentOwner;
  });

  // 获取搜索词（注意这里只读，不重置输入框）
  var searchTerm = (window._cardSearchTerm || '').trim();

  var bodyHtml = '';

  if (searchTerm) {
    var matched = filteredCards.filter(function(c) {
      return c.text && c.text.indexOf(searchTerm) > -1;
    });
    if (matched.length === 0) {
      bodyHtml = '<div class="card-empty">没有找到包含「' + searchTerm + '」的字卡</div>';
    } else {
      bodyHtml = '<div class="card-count">找到 ' + matched.length + ' 条</div><div class="card-list">';
      matched.forEach(function(c) { bodyHtml += renderSingleCardHtml(c); });
      bodyHtml += '</div>';
    }
  } else {
    var groupsHtml = '';
    filteredCats.forEach(function(cat) {
      var cards = filteredCards.filter(function(c) { return c.cat === cat.id; });
      var collapsed = cat.collapsed || false;
      var catBlocked = cat.blocked || false;

      var cardsHtml = '';
      if (cards.length === 0) {
        cardsHtml = '<div class="card-empty-inline">暂无字卡</div>';
      } else {
        cardsHtml = '<div class="card-list">';
        cards.forEach(function(c) { cardsHtml += renderSingleCardHtml(c); });
        cardsHtml += '</div>';
      }

      groupsHtml += '<div class="category-group' + (catBlocked ? ' blocked' : '') + '">';
      groupsHtml += '<div class="category-header" onclick="toggleCategory(\'' + cat.id + '\')">';
      groupsHtml += '<span class="cat-name">' + cat.name + '（' + cards.length + '）</span>';
      groupsHtml += '<div class="cat-actions">';
      groupsHtml += '<span class="cat-action" onclick="event.stopPropagation();toggleBlockCategory(\'' + cat.id + '\')" title="屏蔽本组">' + (catBlocked ? '🔇' : '🔊') + '</span>';
      groupsHtml += '<span class="cat-action" onclick="event.stopPropagation();deleteCategory(\'' + cat.id + '\')" title="删除本组">🗑</span>';
      groupsHtml += '<span class="cat-toggle' + (collapsed ? ' collapsed' : '') + '">▼</span>';
      groupsHtml += '</div></div>';
      groupsHtml += '<div class="category-body' + (collapsed ? ' hidden' : '') + '">' + cardsHtml + '</div></div>';
    });

    if (filteredCats.length === 0) {
      groupsHtml = '<div class="card-empty">还没有分类，请点击上方「+ 分类」</div>';
    }
    bodyHtml = groupsHtml;
  }

  // 3. 只更新列表容器，绝对不碰外面的搜索框
  container.innerHTML = bodyHtml;
}

// 4. 初始化搜索框的事件（在 init 里调用一次即可）
function initCardSearchEvent() {
  var searchInp = document.getElementById('cardSearchInput');
  if (!searchInp) return;

  // 处理输入法中文拼写
  searchInp.addEventListener('input', function(e) {
    if (e.isComposing) return; // 如果还在拼写拼音，直接返回，不动页面
    window._cardSearchTerm = this.value;
    clearTimeout(window._searchDebounce);
    window._searchDebounce = setTimeout(function() {
      renderWordCards(); // 延迟 400ms 再刷新列表
    }, 400);
  });

  // 输入法选字完成后触发
  searchInp.addEventListener('compositionend', function(e) {
    window._cardSearchTerm = this.value;
    clearTimeout(window._searchDebounce);
    window._searchDebounce = setTimeout(function() {
      renderWordCards();
    }, 100);
  });
}

function renderSingleCardHtml(c) {
  var blocked = c.blocked || false;
  var html = '<div class="card-item' + (blocked ? ' blocked' : '') + '">';
  html += '<div class="card-item-text">' + (c.text || '') + '</div>';
  html += '<div class="card-item-actions">';
  html += '<span onclick="toggleBlockCard(\'' + c.id + '\')" title="' + (blocked ? '取消屏蔽' : '屏蔽') + '">' + (blocked ? '🔇' : '🔊') + '</span>';
  html += '<span onclick="editCard(\'' + c.id + '\')" title="编辑">✎</span>';
  html += '<span onclick="deleteCard(\'' + c.id + '\')" title="删除">🗑️</span>';
  html += '</div>';
  html += '</div>';
  return html;
}


window._addCardTab = 'single';

function openAddCardModal() {
  var sel = document.getElementById('addCardCatSelect');
  if (!sel) return;
  
  var currentOwner = window._currentCardOwner || 'all';
  
  // 1. 筛选当前归属的分类
  var filteredCats = state.categories.filter(function(c) {
    return (c.dreamId || 'all') === currentOwner;
  });

  // 2. 如果当前角色连个分类都没有，强行给他建一个“默认”分类
  if (filteredCats.length === 0) {
    var newCatId = 'cat_' + Date.now();
    state.categories.push({ id: newCatId, name: '默认', collapsed: false, dreamId: currentOwner });
    saveState();
    filteredCats = state.categories.filter(function(c) { return c.id === newCatId; });
  }

  // 3. 渲染下拉框
  sel.innerHTML = filteredCats.map(function(c) {
    return '<option value="' + c.id + '">' + c.name + '</option>';
  }).join('');
  
  document.getElementById('addCardTextInput').value = '';
  document.getElementById('addCardBatchInput').value = '';
  switchAddCardTab('single');
  document.getElementById('addCardModal').style.display = 'flex';
  setTimeout(function() {
    var inp = document.getElementById('addCardTextInput');
    if (inp) inp.focus();
  }, 100);
}

function switchAddCardTab(tab) {
  window._addCardTab = tab;
  var single = document.getElementById('addCardTabSingle');
  var batch = document.getElementById('addCardTabBatch');
  var textInp = document.getElementById('addCardTextInput');
  var batchInp = document.getElementById('addCardBatchInput');
  if (tab === 'single') {
    single.style.background = '#007aff';
    single.style.color = '#fff';
    batch.style.background = '#f0f0f5';
    batch.style.color = '#555';
    textInp.style.display = 'block';
    batchInp.style.display = 'none';
    textInp.focus();
  } else {
    batch.style.background = '#007aff';
    batch.style.color = '#fff';
    single.style.background = '#f0f0f5';
    single.style.color = '#555';
    textInp.style.display = 'none';
    batchInp.style.display = 'block';
    batchInp.focus();
  }
}

function closeAddCardModal() {
  var m = document.getElementById('addCardModal');
  if (m) m.style.display = 'none';
}

function confirmAddCard() {
  var catId = document.getElementById('addCardCatSelect').value;
  var tab = window._addCardTab || 'single';
  var currentOwner = window._currentCardOwner || 'all';

  if (!catId) {
    showToast('分类异常，请重新打开弹窗');
    return;
  }

  // === 单条添加 ===
  if (tab === 'single') {
    var text = (document.getElementById('addCardTextInput').value || '').trim();
    if (!text) { showToast('请输入字卡内容'); return; }
    
    // 只在当前归属下查重
    var exists = state.cards.some(function(c) { 
      return (c.dreamId || 'all') === currentOwner && (c.text || '').trim() === text; 
    });
    if (exists) { showToast('该字卡在当前归属下已存在'); return; }
    
    // 👈 重点：绑定 dreamId
    state.cards.push({ 
      id: 'card_' + Date.now() + '_' + Math.random().toString(36).slice(2,6), 
      text: text, 
      cat: catId,
      dreamId: currentOwner
    });
    saveState();
    renderWordCards();
    closeAddCardModal();
    showToast('已添加');
  } 
  // === 批量添加 ===
  else {
    var raw = document.getElementById('addCardBatchInput').value || '';
    var lines = raw.split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
    if (lines.length === 0) { showToast('请输入字卡'); return; }
    
    // 只在当前归属下查重
    var existing = {};
    state.cards.forEach(function(c) { 
      if ((c.dreamId || 'all') === currentOwner) {
        existing[(c.text || '').trim()] = true; 
      }
    });
    
    var added = 0, skipped = 0;
    lines.forEach(function(line) {
      if (existing[line]) { skipped++; return; }
      
      // 👈 重点：批量添加也绑定 dreamId
      state.cards.push({ 
        id: 'card_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), 
        text: line, 
        cat: catId,
        dreamId: currentOwner
      });
      existing[line] = true;
      added++;
    });
    saveState();
    renderWordCards();
    closeAddCardModal();
    if (skipped > 0) showToast('已添加 ' + added + ' 条，跳过 ' + skipped + ' 条重复');
    else showToast('已添加 ' + added + ' 条');
  }
}

function onCardSearch(val) {
  window._cardSearchTerm = val || '';
  renderWordCards();
  var inp = document.querySelector('.card-search');
  if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}

function dedupeCards() {
  var currentOwner = window._currentCardOwner || 'all';
  var seen = {};
  var dupes = [];
  
  // 只找当前归属下的重复字卡
  state.cards.forEach(function(c) {
    if ((c.dreamId || 'all') !== currentOwner) return; // 跳过其他归属的
    
    var key = (c.text || '').trim();
    if (!key) return;
    if (seen[key] !== undefined) dupes.push(c.id);
    else seen[key] = c.id;
  });

  if (dupes.length === 0) {
    alert('当前归属下没有发现重复的字卡 ✓');
    return;
  }
  if (!confirm('在当前归属下发现 ' + dupes.length + ' 条重复字卡，是否删除？\n\n（不会影响其他梦角的字卡）')) return;
  
  // 只删除过滤出来的重复项
  state.cards = state.cards.filter(function(c) { return dupes.indexOf(c.id) === -1; });
  saveState();
  renderWordCards();
  showToast('已删除 ' + dupes.length + ' 条重复字卡');
}

function toggleBlockCard(cardId) {
  var c = state.cards.find(function(x) { return x.id === cardId; });
  if (!c) return;
  c.blocked = !c.blocked;
  saveState();
  renderWordCards();
  showToast(c.blocked ? '已屏蔽' : '已启用');
}

function toggleBlockCategory(catId) {
  var cat = state.categories.find(function(x) { return x.id === catId; });
  if (!cat) return;
  cat.blocked = !cat.blocked;
  saveState();
  renderWordCards();
  showToast(cat.blocked ? '已屏蔽此分组' : '已启用此分组');
}

function isCardUsable(card) {
  if (!card) return false;
  if (card.blocked) return false;
  var cat = state.categories.find(function(c) { return c.id === card.cat; });
  if (cat && cat.blocked) return false;
  return true;
}

// ===== 新增：编辑单条字卡 =====
function editCard(cardId) {
  var card = state.cards.find(function(c) { return c.id === cardId; });
  if (!card) return;
  
  // 弹出系统自带的输入框（目前最稳妥的手机端方案）
  var newText = prompt('编辑字卡内容：', card.text);
  
  // 如果用户点了取消，或者输入为空，就不改
  if (newText !== null && newText.trim() !== '') {
    card.text = newText.trim();
    saveState();
    renderWordCards();
    showToast('字卡已更新');
  }
}

function toggleCategory(catId) {
  const cat = state.categories.find(c => c.id === catId);
  if (cat) {
    cat.collapsed = !cat.collapsed;
    saveState();
    renderWordCards();
  }
}

function addCategory() {
  const name = prompt('输入分类名称：');
  if (!name || name.trim() === '') return;
  const id = 'cat_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  state.categories.push({ id, name: name.trim(), collapsed: false, dreamId: window._currentCardOwner || 'all' });
  saveState();
  renderWordCards();
  showToast('分类已添加');
}

function deleteCategory(catId) {
  // 解除了默认分类不能删除的限制
  if (!confirm('删除此分类及其所有字卡？此操作不可恢复！')) return;
  
  // 过滤掉要删除的分类和它下面的所有字卡
  state.cards = state.cards.filter(c => c.cat !== catId);
  state.categories = state.categories.filter(c => c.id !== catId);
  
  // 安全兜底：如果所有的分类都被删光了，自动补一个默认分类
  if (state.categories.length === 0) {
    state.categories.push({ id: 'default', name: '默认', collapsed: false });
  }
  
  saveState();
  renderWordCards();
  showToast('分类已删除');
}

function deleteCard(cardId) {
  state.cards = state.cards.filter(c => c.id !== cardId);
  saveState();
  renderWordCards();
}

function batchAddCards() {
  var text = document.getElementById('batchText').value;
  var lines = text.split('\n').map(function(s){return s.trim();}).filter(function(s){return s;});
  if (lines.length === 0) { showToast('请输入字卡'); return; }
  var targetCat = document.getElementById('batchCategory').value || (state.categories[0] && state.categories[0].id) || 'default';
  var existing = {};
  state.cards.forEach(function(c) { existing[(c.text || '').trim()] = true; });
  var added = 0, skipped = 0;
  lines.forEach(function(line) {
    if (existing[line]) { skipped++; return; }
    state.cards.push({ id: 'card_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), text: line, cat: targetCat });
    existing[line] = true;
    added++;
  });
  saveState();
  renderWordCards();
  if (skipped > 0) showToast('已添加 ' + added + ' 条，跳过 ' + skipped + ' 条重复');
  else showToast('已添加 ' + added + ' 条');
}

// ===== CALL HISTORY =====
function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

// ===== SETTINGS =====
function handleCallBg(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    state.settings.callBg = ev.target.result;
    saveState();
    showToast('通话背景已设置');
  };
  reader.readAsDataURL(file);
}

// ===== 清除所有数据 =====
function clearAllData() {
  if (!confirm('确定要清除所有数据吗？\n\n包括梦角、聊天记录、日记、字卡、备忘录、小组件、设置等全部内容。\n\n此操作不可恢复！')) return;
  if (!confirm('再次确认：真的要清除吗？')) return;

  // 清空 localStorage
  try { localStorage.clear(); } catch(e) {}

  // 清空 IndexedDB
  dbPromise.then(function(db) {
    try {
      var tx1 = db.transaction('stateStore', 'readwrite');
      tx1.objectStore('stateStore').clear();
      var tx2 = db.transaction('stickerStore', 'readwrite');
      tx2.objectStore('stickerStore').clear();
    } catch(e) {}
    setTimeout(function() { location.reload(); }, 300);
  }).catch(function() {
    setTimeout(function() { location.reload(); }, 300);
  });
}

// ===== 导出字卡 =====
function exportCards() {
  var currentOwner = window._currentCardOwner || 'all';
  
  // 只导出当前归属的分类
  var groups = state.categories.filter(function(cat) {
    return (cat.dreamId || 'all') === currentOwner;
  }).map(function(cat) {
    // 只导出当前归属的字卡
    var items = state.cards
      .filter(function(c) { 
        return c.cat === cat.id && (c.dreamId || 'all') === currentOwner; 
      })
      .map(function(c) { return c.text; });
    return { name: cat.name, items: items };
  });

  // 处理没有分类的字卡（防止遗漏）
  var groupedIds = groups.map(function(g) { return g.name; });
  var ungroupedCards = state.cards.filter(function(c) {
    var cat = state.categories.find(function(x) { return x.id === c.cat; });
    return (c.dreamId || 'all') === currentOwner && (!cat || !groupedIds.includes(cat.name));
  }).map(function(c) { return c.text; });
  
  if (ungroupedCards.length > 0) {
    groups.push({ name: '未分类', items: ungroupedCards });
  }

  var data = {
    customReplyGroups: groups,
    exportAt: new Date().toISOString(),
    version: 1
  };

  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'Mind_字卡_' + (currentOwner === 'all' ? '通用' : getDreamName(currentOwner)) + '_' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1500);

  showToast('已导出当前归属的字卡');
}

function backupData() {
  var data = {
    state: state,
    chatMessages: chatMessages,
    // 补充：表情包、私聊背景、陪伴设置、聊天设置
    stickers: JSON.parse(localStorage.getItem('dreamStickers') || '[]'),
    stickerGroups: stickerGroups,
    dreamChatBg: localStorage.getItem('dreamChatBg') || null,
    dreamChatSettings: localStorage.getItem('dreamChatSettings') || null,
    comp_bg: localStorage.getItem('comp_bg') || null,
    comp_color: localStorage.getItem('comp_color') || null,
    comp_fontsize: localStorage.getItem('comp_fontsize') || null,
    comp_bgblur: localStorage.getItem('comp_bgblur') || null,
    comp_avatar: localStorage.getItem('comp_avatar') || null,
    version: 2
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Mind_备份_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('数据已备份（含表情/背景/陪伴）');
}

function restoreData(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      // 恢复 state
      if (data.state) {
        Object.assign(state, data.state);
        if (data.chatMessages) chatMessages = data.chatMessages;
      } else {
        Object.assign(state, data);
        if (data.chatMessages) chatMessages = data.chatMessages;
      }
           // 恢复表情包（新结构）
if (data.stickerGroups && Array.isArray(data.stickerGroups)) {
  stickerGroups = data.stickerGroups;
  saveStickerGroups();
} else if (data.stickers && Array.isArray(data.stickers)) {
  stickerGroups = [{ id: 'default', name: '默认', items: data.stickers }];
  saveStickerGroups();
}
            // 容错写 localStorage（容量满时静默跳过，不影响 state 恢复）
      function safeSet(key, val) {
        if (val === null || val === undefined) return;
        try { localStorage.setItem(key, val); } catch(e) { console.warn('localStorage 满，跳过 ' + key); }
      }

      // 恢复私聊聊天背景
      if (data.dreamChatBg) {
        safeSet('dreamChatBg', data.dreamChatBg);
      } else if (data.dreamChatBg === null && data.version >= 2) {
        try { localStorage.removeItem('dreamChatBg'); } catch(e) {}
      }
      // 恢复聊天设置
      if (data.dreamChatSettings) {
        safeSet('dreamChatSettings', data.dreamChatSettings);
      }
      // 恢复陪伴设置
      if (data.comp_bg) safeSet('comp_bg', data.comp_bg);
      if (data.comp_color) safeSet('comp_color', data.comp_color);
      if (data.comp_fontsize) safeSet('comp_fontsize', data.comp_fontsize);
      if (data.comp_bgblur) safeSet('comp_bgblur', data.comp_bgblur);
      if (data.comp_avatar) safeSet('comp_avatar', data.comp_avatar);

      saveState();
      if (typeof renderAll === 'function') renderAll();
      showToast('数据已恢复（含表情/背景/陪伴）');
      // 延迟刷新，让状态全部加载
      setTimeout(function() { location.reload(); }, 800);
    } catch(err) {
      showToast('备份文件格式错误');
      console.error(err);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function togglePush() {
  state.settings.pushEnabled = !state.settings.pushEnabled;
  const toggle = document.getElementById('pushToggle');
  toggle.classList.toggle('on', state.settings.pushEnabled);
  saveState();
  if (state.settings.pushEnabled) {
    requestPushPermission();
  }
  showToast(state.settings.pushEnabled ? '推送已开启' : '推送已关闭');
}

function setupPush() {
  const toggle = document.getElementById('pushToggle');
  toggle.classList.toggle('on', state.settings.pushEnabled);
  document.getElementById('pushToggle').onclick = togglePush;
}

async function requestPushPermission() {
  if (!('Notification' in window)) { showToast('不支持通知'); return; }
  if (Notification.permission === 'granted') {
    // CodePen 环境屏蔽 Service Worker 注册，但本地没问题
    if ('serviceWorker' in navigator) registerSW();
  } else if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      if ('serviceWorker' in navigator) registerSW();
    }
    else { showToast('请允许通知权限'); state.settings.pushEnabled = false; document.getElementById('pushToggle').classList.remove('on'); saveState(); }
  } else {
    showToast('通知已被拒绝'); state.settings.pushEnabled = false; document.getElementById('pushToggle').classList.remove('on'); saveState();
  }
}

async function registerSW() {
  try {
    const reg = await navigator.serviceWorker.register('sw.js');
    showToast('推送已开启');
  } catch(e) {
    showToast('推送注册失败（预览环境不支持）');
  }
}

// ===== RANDOM EVENTS =====
function startRandomEvents() {
  setInterval(() => {
    if (state.callState !== 'idle') return;
    if (Math.random() < 0.4) {
      triggerRandomEvent();
    }
  }, 45000);
}

function triggerRandomEvent() {
  var r = Math.random();
  if (r < 0.05) {
    if (state.callState === 'idle') triggerCall();
  } else {
    var allCards = getUsableCards();
    if (allCards.length > 0 && state.dreams && state.dreams.length > 0) {
      var card = allCards[Math.floor(Math.random() * allCards.length)];
      
      // 随机挑一个梦角来给你发消息
      var randomDream = state.dreams[Math.floor(Math.random() * state.dreams.length)];
      
      // 如果是当前打开的聊天窗口，就追加进去
      var chatPage = document.getElementById('pagePrivateChat');
      if (chatPage && chatPage.classList.contains('active') && state.currentChatId) {
         // 如果是群聊，找群里的随机人发
         if (state.currentChatId.startsWith('group_')) {
          var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
          if (g && g.memberIds.length > 0) {
            // 过滤掉被禁言的成员
            var availableIds = g.memberIds.filter(function(id) {
              return !g.muteEndsAt || g.muteEndsAt[String(id)] === undefined;
            });
            if (availableIds.length > 0) {
              var randomId = availableIds[Math.floor(Math.random() * availableIds.length)];
              var member = state.dreams.find(function(d) { return d.id === randomId; });
              if (member) randomDream = member;
            } else {
              return;
            }
          }
         }
         chatMessages.push({ from: 'dream', senderId: randomDream.id, senderAvatar: randomDream.avatar, text: card.text, time: Date.now() });
         saveChatMessages();
         renderChatMessages();
      }
    }
  }
}
// ===== VOICE CALL =====
function triggerCall() {
  if (state.callState !== 'idle') {
    // 【忙音】用户正在通话时，其他人打来，在对应聊天显示小字
    var busyCaller = null;
    if (state.currentChatId && state.currentChatId.startsWith('group_')) {
      var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
      if (g && g.memberIds.length > 0) {
        var rid = g.memberIds[Math.floor(Math.random() * g.memberIds.length)];
        busyCaller = state.dreams.find(function(d) { return d.id === rid; });
      }
    } else if (state.currentChatId) {
      busyCaller = state.dreams.find(function(d) { return d.id === state.currentChatId; });
    }
    if (!busyCaller && state.dreams && state.dreams.length > 0) {
      busyCaller = state.dreams[Math.floor(Math.random() * state.dreams.length)];
    }
    if (busyCaller && state.currentChatId) {
      if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
      state.chatSessions[state.currentChatId].push({
        from: 'system',
        text: '「' + busyCaller.name + '」打来电话，但你正在通话中，请稍候再试',
        time: Date.now()
      });
      saveState();
      loadChatMessages();
      renderChatMessages();
      showToast('「' + busyCaller.name + '」来电，你正忙');
    }
    return;
  }

  // 【核心修复】：决定是谁打来的电话
  var caller = null;
  if (state.currentChatId && state.currentChatId.startsWith('group_')) {
    // 如果是群聊，随机抽一个群成员
    var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
    if (g && g.memberIds.length > 0) {
      var randomId = g.memberIds[Math.floor(Math.random() * g.memberIds.length)];
      caller = state.dreams.find(function(d) { return d.id === randomId; });
    }
  } else if (state.currentChatId) {
    // 如果是私聊，直接让当前私聊对象打来
    caller = state.dreams.find(function(d) { return d.id === state.currentChatId; });
  }
  
    // 兜底：如果没找到，从所有梦角里随机抽一个
  if (!caller && state.dreams && state.dreams.length > 0) {
    caller = state.dreams[Math.floor(Math.random() * state.dreams.length)];
  }
  // 如果连梦角都没有，直接终止，不打这个电话
  if (!caller) return;

  state.callState = 'ringing';
  
  var avatar = caller.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2780%27 height=%2780%27 viewBox=%270 0 80 80%27%3E%3Ccircle cx=%2740%27 cy=%2740%27 r=%2740%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2740%27 y=%2744%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2728%27%3E💜%3C/text%3E%3C/svg%3E';
  document.getElementById('callAvatar').src = avatar;
  document.getElementById('callName').textContent = caller.name;
  document.getElementById('callStatus').textContent = '来电中…';
  document.getElementById('callTimer').classList.remove('show');
    document.getElementById('callButtons').innerHTML = `
    <button class="call-btn hangup" onclick="hangupCall()">
      <div class="btn-icon">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(135deg);"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
      </div>
      <span>拒绝</span>
    </button>
    <button class="call-btn answer" onclick="answerCall()">
      <div class="btn-icon">
         <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
      </div>
      <span>接听</span>
    </button>
  `;
  
  if (state.settings.callBg) {
    document.getElementById('callCard').style.background = `url(${state.settings.callBg}) center/cover, linear-gradient(145deg,#1a1a2e,#16213e)`;
  } else {
    document.getElementById('callCard').style.background = 'linear-gradient(145deg,#1a1a2e,#16213e)';
  }
  
  document.getElementById('callOverlay').classList.add('active');
  document.getElementById('callMini').classList.remove('show');
  sendNotification(caller.name, '来电了…');

  // 记录通话历史时，也顺便记录是谁打来的
  setTimeout(() => {
    if (state.callState === 'ringing') {
      state.callState = 'idle';
      document.getElementById('callOverlay').classList.remove('active');
      saveState();
      showToast('未接来电 - ' + caller.name);
      sendNotification(caller.name, '你有一个未接来电');
    }
  }, 15000);
}

function answerCall() {
  if (state.callState !== 'ringing') return;
  state.callState = 'connected';
  state.callStartTime = Date.now();
  state.callElapsed = 0;
  document.getElementById('callStatus').textContent = '通话中';
  document.getElementById('callTimer').classList.add('show');
  document.getElementById('callButtons').innerHTML = `
    <button class="call-btn minimize" onclick="minimizeCall()">−</button>
    <button class="call-btn hangup" onclick="hangupCall()">
      <div class="btn-icon" style="background:#eb5545;">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(135deg);"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
      </div>
      <span>挂断</span>
    </button>
  `;
  if (state.callTimerInterval) clearInterval(state.callTimerInterval);
  state.callTimerInterval = setInterval(() => {
    state.callElapsed = Math.floor((Date.now() - state.callStartTime) / 1000);
    document.getElementById('callTimer').textContent = formatDuration(state.callElapsed);
    document.getElementById('miniTime').textContent = formatDuration(state.callElapsed).slice(0,5);
  }, 1000);
  saveState();
}

function minimizeCall() {
  if (state.callState !== 'connected') return;
  state.callState = 'minimized';
  document.getElementById('callOverlay').classList.remove('active');
  const avatar = state.dream.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2716%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2716%27 y=%2720%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2716%27%3E💜%3C/text%3E%3C/svg%3E';
  document.getElementById('miniAvatar').src = avatar;
  document.getElementById('miniTime').textContent = formatDuration(state.callElapsed).slice(0,5);
  document.getElementById('callMini').classList.add('show');
}

function expandCall() {
  if (window.callMiniMoved) return;
  if (state.callState !== 'minimized') return;
  state.callState = 'connected';
  document.getElementById('callMini').classList.remove('show');
  document.getElementById('callOverlay').classList.add('active');
  document.getElementById('callStatus').textContent = '通话中';
  document.getElementById('callTimer').classList.add('show');
  document.getElementById('callButtons').innerHTML = `
    <button class="call-btn minimize" onclick="minimizeCall()">−</button>
    <button class="call-btn hangup" onclick="hangupCall()">
      <div class="btn-icon" style="background:#eb5545;">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(135deg);"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>
      </div>
      <span>挂断</span>
    </button>
  `;
  if (state.settings.callBg) {
    document.getElementById('callCard').style.background = `url(${state.settings.callBg}) center/cover, linear-gradient(145deg,#1a1a2e,#16213e)`;
  } else {
    document.getElementById('callCard').style.background = 'linear-gradient(145deg,#1a1a2e,#16213e)';
  }
}

// ===== NOTIFICATION =====
async function sendNotification(title, body, chatId) {
  if (!state.settings.pushEnabled) return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // 1. 如果明确传入了 chatId，直接判断是否免打扰
  if (chatId && state.mutedChats && state.mutedChats.indexOf(chatId) > -1) {
    return; 
  }

  // 2. 如果没传 chatId，通过名字反查一下是不是免打扰的梦角
  if (state.mutedChats && state.mutedChats.length > 0) {
    var mutedDream = state.dreams.find(function(d) { return d.name === title; });
    if (mutedDream && state.mutedChats.indexOf(mutedDream.id) > -1) return;
  }
    // 正在聊天界面时，本聊天的消息不弹通知
  var _chatPage = document.getElementById('pagePrivateChat');
  if (_chatPage && _chatPage.classList.contains('active') && state.currentChatId) {
    if (state.currentChatId.startsWith('group_')) {
      // 在群聊里 → 任何成员的消息都不弹（因为你能直接看到）
      return;
    } else {
      // 在私聊里 → 只有当前私聊对象的消息不弹；其他梦角发的照样弹
      var _curDream = state.dreams.find(function(x) { return x.id === state.currentChatId; });
      if (_curDream && _curDream.name === title) return;
    }
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(title, {
  body: body,
  icon: '',
      tag: 'dream-' + Date.now(),
      requireInteraction: true,
      vibrate: [200,100,200]
    });
  } catch(e) {
    try {
      const n = new Notification(title, {
        body: body,
        icon: state.dream.avatar || '',
        tag: 'dream-' + Date.now(),
        requireInteraction: true
      });
      setTimeout(() => n.close(), 5000);
    } catch(err) {}
  }
}

// ===== CHAT =====
let chatMessages = [];
let chatSettings = loadChatSettings();
function getCurrentChatSettings() {
  if (!state.currentChatId) return { bg: null, bubbleUser: '#e8e8ed', bubbleDream: '#e8e8ed', fontColor: '#1d1d1f', readNoReply: false };
  if (!state.settings.chatSettingsMap) state.settings.chatSettingsMap = {};
  if (!state.settings.chatSettingsMap[state.currentChatId]) {
    state.settings.chatSettingsMap[state.currentChatId] = { bg: null, bubbleUser: null, bubbleDream: null, fontColor: null, readNoReply: false };
  }
  return state.settings.chatSettingsMap[state.currentChatId];
}
// ===== 表情包分组数据 =====
var stickerGroups = loadStickerGroups();
var currentStickerGroupId = 'default';

function loadStickerGroups() {
  var saved = localStorage.getItem('dreamStickerGroups');
  var groups = null;
  if (saved) {
    try {
      var parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) groups = parsed;
    } catch(e) {}
  }
  if (!groups) {
    var old = [];
    try { old = JSON.parse(localStorage.getItem('dreamStickers') || '[]'); } catch(e) {}
    groups = [{ id: 'default', name: '默认', items: old }];
  }

  dbPromise.then(function(db) {
    var tx = db.transaction('stickerStore', 'readonly');
    var req = tx.objectStore('stickerStore').get('stickerGroups');
    req.onsuccess = function(e) {
      var result = e.target.result;
      if (result) {
        try {
          var latest = JSON.parse(result);
          if (Array.isArray(latest) && latest.length > 0) {
            stickerGroups = latest;
            try { renderStickerGroups(); } catch(err) {}
            try { renderStickers(); } catch(err) {}
          }
        } catch(err) {}
      } else {
        saveStickerGroups();
      }
    };
  }).catch(function(e) {
    console.error('读取表情包 IndexedDB 失败', e);
  });

  return groups;
}

function saveStickerGroups() {
  var data = JSON.stringify(stickerGroups);
  dbPromise.then(function(db) {
    var tx = db.transaction('stickerStore', 'readwrite');
    tx.objectStore('stickerStore').put(data, 'stickerGroups');
  }).catch(function(e) {
    console.error('表情包保存失败', e);
    showToast('表情包保存失败');
  });
  try { localStorage.setItem('dreamStickerGroups', data); } catch(e) {}
}

function getCurrentStickerGroup() {
  var g = stickerGroups.find(function(x) { return x.id === currentStickerGroupId; });
  if (!g) {
    g = stickerGroups[0];
    currentStickerGroupId = g ? g.id : 'default';
  }
  return g;
}

// 兼容旧代码：把所有分组的表情包平铺成一个数组
function getAllStickers() {
  var arr = [];
  stickerGroups.forEach(function(g) {
    (g.items || []).forEach(function(item, idx) {
      arr.push({ groupId: g.id, index: idx, data: item });
    });
  });
  return arr;
}

function saveChatMessages() {
  if (!state.currentChatId) return;
  state.chatSessions[state.currentChatId] = JSON.parse(JSON.stringify(chatMessages));
  // 记录"最后互动时间"，用来判断多久没聊天
  if (!state.lastActivityAt) state.lastActivityAt = {};
  state.lastActivityAt[state.currentChatId] = Date.now();
  saveState();
}

function loadChatMessages() {
  if (!state.currentChatId) {
    chatMessages = [];
    return;
  }
  
  var rawMessages = state.chatSessions[state.currentChatId] || [];
  
  // 【终极修复】：强制清洗掉所有的 null、undefined 等脏数据
  chatMessages = rawMessages.filter(function(msg) {
    return msg && typeof msg === 'object' && msg.from !== undefined;
  });
  
  // 如果清洗后数据有变化，顺手保存一下干净的记录
  if (chatMessages.length !== rawMessages.length) {
    state.chatSessions[state.currentChatId] = chatMessages;
    saveState();
  }
}

var replyTimeout = null; // 新增：用来存那个“AI回复的闹钟”

window.replyTimeout = null; // 挂在全局，确保处处都能杀掉这个闹钟

function sendChatMsg() {
  var input = document.getElementById('chatInput');
  var text = input.value.trim();
  if (text.length === 0) return;

  if (state.currentChatId && state.currentChatId.startsWith('group_')) {
    var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
    if (g) {
      checkExpiredMutes(g); 
      if (g.muteEndsAt && g.muteEndsAt[String('user')] !== undefined) {
        var remainMins = Math.ceil((g.muteEndsAt[String('user')] - Date.now()) / 60000);
        showToast('你已被群主禁言，还剩 ' + remainMins + ' 分钟');
        return; 
      }
    }
  }

  // 新增：status: 'unread' 表示未读
    var newMsg = { from: 'user', text: text, time: Date.now(), status: 'unread' };
  if (window.quoteData) {
    newMsg.quote = window.quoteData;
    clearQuote();
  }
  chatMessages.push(newMsg);
  input.value = '';
  renderChatMessages();
  saveChatMessages();
  
  scheduleAiReply();
}

function dreamReply() {
    // 【强制已读】：AI 只要开始回复，用户的上一条消息必定变成已读
  for (var i = 0; i < chatMessages.length; i++) {
    if (chatMessages[i].from === 'user') {
      chatMessages[i].status = 'read';
    }
  }
  var useSticker = false;
  var stickerIdx = -1;
  var useCard = false;
  var senderId = '';
  var senderAvatar = '';
  var isGroup = state.currentChatId && state.currentChatId.startsWith('group_');

  if (isGroup) {
    var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
    if (g) {
      checkExpiredMutes(g);
                  // AI 主动发起群聊通话（10% 概率）
      if (Math.random() < 0.10 && state.activeCalls.length < 3) {
        // 发起人必须不在任何通话中
        var idleCandidates = g.memberIds.filter(function(id) {
          return String(id) !== 'user' && !isDreamBusy(id);
        });
        if (idleCandidates.length > 0) {
          var initiatorId = idleCandidates[Math.floor(Math.random() * idleCandidates.length)];
          var initiator = state.dreams.find(function(d) { return d.id === initiatorId; });
          if (initiator) {
            // 被邀请人必须不在任何通话中
            var candidates = g.memberIds.filter(function(id) {
              return String(id) !== String(initiatorId) && String(id) !== 'user' && !isDreamBusy(id);
            });
            if (candidates.length > 0) {
              var inviteCount = Math.min(candidates.length, 1 + Math.floor(Math.random() * 2));
              var invited = [];
              for (var i = 0; i < inviteCount; i++) {
                var pick = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
                invited.push(pick);
              }
              if (invited.length > 0) {
                var session = {
                  id: 'call_' + Date.now(),
                  chatId: g.id,
                  type: 'group',
                  initiator: initiatorId,
                  participants: [initiatorId].concat(invited),
                  invited: [],
                  startTime: Date.now(),
                  status: 'connected',
                  userInCall: false
                };
                state.activeCalls.push(session);
                var names = invited.map(function(id) { return getDreamName(id); });
                addSystemMessage(g.id, '「' + initiator.name + '」发起了群聊通话\n通话成员有：' + [initiator.name].concat(names).join('、'));
                startAICallSimulation(session, g);
              }
            }
          }
        }
      }
            // 5% 概率有成员主动退群
if (Math.random() < 0.05) {
  var candidates = g.memberIds.filter(function(id) {
    return String(id) !== String(g.ownerId);
  });
  if (candidates.length > 0) {
    var leaverId = candidates[Math.floor(Math.random() * candidates.length)];
    var leaver = state.dreams.find(function(d) { return d.id === leaverId; });
    if (leaver) {
      g.memberIds = g.memberIds.filter(function(id) { return String(id) !== String(leaverId); });
      if (g.muteEndsAt) delete g.muteEndsAt[String(leaverId)];
      if (!state.chatSessions[g.id]) state.chatSessions[g.id] = [];
      state.chatSessions[g.id].push({ from: 'system', text: '「' + leaver.name + '」主动退出了群聊', time: Date.now() });
      saveState();
      // 【核心修复】：立刻刷新界面，并弹个小提示
      if (state.currentChatId === g.id) {
        loadChatMessages();
        renderChatMessages();
      }
      showToast('「' + leaver.name + '」退出了群聊');
    }
  }
}
      
      if (g.ownerId !== 'user' && Math.random() < 0.4) {
        aiGroupOwnerAction(g);
        return; 
      }

            if (window.nextReplySender) {
        senderId = window.nextReplySender.id;
        senderAvatar = window.nextReplySender.avatar;
        window.nextReplySender = null;
      } else if (g.memberIds.length > 0) {
        var availableIds = g.memberIds.filter(function(id) {
          return !g.muteEndsAt || g.muteEndsAt[String(id)] === undefined;
        });
        if (availableIds.length === 0) return; 
        var randomMemberId = availableIds[Math.floor(Math.random() * availableIds.length)];
        var member = state.dreams.find(function(item) { return item.id === randomMemberId; });
        if (member) { senderId = member.id; senderAvatar = member.avatar; }
      }
    }
  }

  // 【终极防弹玻璃】：如果抽中的人被禁言了，直接闭嘴！
  if (senderId && isGroup) {
    var gCheck = state.groups.find(function(item) { return item.id === state.currentChatId; });
    if (gCheck && gCheck.muteEndsAt && gCheck.muteEndsAt[String(senderId)] !== undefined) {
      return; 
    }
  }
    // 【新增】：群聊或私聊，AI有5%概率发拍一拍
  var usePoke = false;
  if (state.pokes && state.pokes.length > 0 && Math.random() < 0.05) {
    usePoke = true;
  }
  
  // 【核心修复】：如果是私聊，把 senderId 补上，这样才找得到专属字卡！
  if (!isGroup) {
    senderId = state.currentChatId;
  }

  // 👇 现在 senderId 确定是谁了，再去拿对应的专属字卡！
  var cards = getUsableCards(senderId);
  
  // 决定发字卡还是表情包
  var stickers = getAllStickers().map(function(x) { return x.data; });
  var hasCards = cards.length > 0;
  var hasStickers = stickers.length > 0;
  if (hasCards && hasStickers) {
    if (Math.random() < 0.85) useCard = true; else useSticker = true;
  } else if (hasCards) {
    useCard = true;
  } else if (hasStickers) {
    useSticker = true;
  }

  // ===== 梦角主动引用用户消息（15% 概率） =====
  var autoQuote = null;
  if (state.settings && state.settings.dreamQuoteEnabled !== false && Math.random() < 0.15) {
    var userMsgs = [];
    for (var qi = chatMessages.length - 1; qi >= 0 && userMsgs.length < 5; qi--) {
      if (chatMessages[qi] && chatMessages[qi].from === 'user') userMsgs.push(chatMessages[qi]);
    }
    if (userMsgs.length > 0) {
      var picked = userMsgs[Math.floor(Math.random() * userMsgs.length)];
      autoQuote = {
        text: picked.text || '[表情]',
        senderName: state.profile.name || '我',
        msgId: -1
      };
    }
  }

  // ===== 梦角主动收藏用户消息（10% 概率） =====
  if (Math.random() < 0.10) {
    var userMsgs2 = [];
    for (var fi = chatMessages.length - 1; fi >= 0 && userMsgs2.length < 5; fi--) {
      if (chatMessages[fi] && chatMessages[fi].from === 'user') userMsgs2.push(chatMessages[fi]);
    }
    if (userMsgs2.length > 0) {
      if (!state.favorites) state.favorites = [];
      var pickedFav = userMsgs2[Math.floor(Math.random() * userMsgs2.length)];
      var fromName = '梦角';
      var fromId = 'dream';
      if (isGroup && senderId) {
        var senderD = state.dreams.find(function(d) { return d.id === senderId; });
        if (senderD) { fromName = senderD.name; fromId = senderD.id; }
      } else if (state.currentChatId) {
        var senderD2 = state.dreams.find(function(d) { return d.id === state.currentChatId; });
        if (senderD2) { fromName = senderD2.name; fromId = senderD2.id; }
      }
      var chatName2 = '';
      if (isGroup) {
        var gFav = state.groups.find(function(x) { return x.id === state.currentChatId; });
        chatName2 = gFav ? ('群聊：' + gFav.name) : '';
      } else {
        var dFav = state.dreams.find(function(x) { return x.id === state.currentChatId; });
        chatName2 = dFav ? ('私聊：' + dFav.name) : '';
      }
      state.favorites.push({
        id: 'fav_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        text: pickedFav.text || '[表情]',
        senderName: state.profile.name || '我',
        isUser: true,
        chatName: chatName2,
        time: pickedFav.time,
        addedAt: Date.now(),
        favBy: fromName,
        favById: fromId
      });
      saveState();
    }
  }

  // 【核心修复】：优先处理拍一拍
if (usePoke) {
  var pokeText = state.pokes[Math.floor(Math.random() * state.pokes.length)];
  var pokeSenderName = senderId ? getDreamName(senderId) : (state.dream.name || '梦角');
  chatMessages.push({
    from: 'dream',
    type: 'poke',
    text: pokeText,
    senderName: pokeSenderName,
    senderId: senderId,
    time: Date.now()
  });
} else   
  // ===== 【新增：自由断句功能】 =====
if (useCard) {
    var finalText = buildCardText(cards);
    
    // 30% 的概率触发断句效果
        var isSplit = (state.settings.cutEnabled !== false) && (Math.random() < 0.5);
    if (isSplit && finalText.length > 1) {
        // 随机找一个切分点（大概在中间附近，不切在标点符号上）
        var cutIndex = Math.floor(finalText.length * (0.4 + Math.random() * 0.2));
        var part1 = finalText.slice(0, cutIndex).trim();
        var part2 = finalText.slice(cutIndex).trim();
        
        var sendMode = Math.random();
        
        if (sendMode < 0.4) {
            // 1. 只发前半句（带右侧渐变）
            var _cMsg1 = { from: 'dream', senderId: senderId, senderAvatar: senderAvatar, text: part1, cut: 'end', time: Date.now() };
            if (autoQuote) _cMsg1.quote = autoQuote;
            chatMessages.push(_cMsg1);
        } else if (sendMode < 0.8) {
            // 2. 只发后半句（带左侧渐变）
            var _cMsg2 = { from: 'dream', senderId: senderId, senderAvatar: senderAvatar, text: part2, cut: 'start', time: Date.now() };
            if (autoQuote) _cMsg2.quote = autoQuote;
            chatMessages.push(_cMsg2);
        } else {
            // 3. 分两条发（先发前半句，1.5秒后发后半句）
            var _cMsg1 = { from: 'dream', senderId: senderId, senderAvatar: senderAvatar, text: part1, cut: 'end', time: Date.now() };
            if (autoQuote) _cMsg1.quote = autoQuote;
            chatMessages.push(_cMsg1);
            
            var _chatIdSnapshot = state.currentChatId; // 记录当前聊天
            setTimeout(function() {
                // 确保还在这个聊天里
                if (state.currentChatId === _chatIdSnapshot) {
                    var _cMsg2 = { from: 'dream', senderId: senderId, senderAvatar: senderAvatar, text: part2, cut: 'start', time: Date.now() };
                    chatMessages.push(_cMsg2);
                    saveChatMessages();
                    renderChatMessages();
                }
            }, 1500); // 1.5秒后发第二段
        }
    } else {
        // 正常发送完整句子
        var _cMsg = { from: 'dream', senderId: senderId, senderAvatar: senderAvatar, text: finalText, time: Date.now() };
        if (autoQuote) _cMsg.quote = autoQuote;
        chatMessages.push(_cMsg);
    }
} else if (useSticker) {
// ===== 断句功能结束 =====
  var lastMsg = chatMessages[chatMessages.length - 1];
  if (lastMsg === undefined || lastMsg === null) lastMsg = { from: 'system' };
  if (stickers.length > 1 && lastMsg.from === 'user' && lastMsg.stickerIdx !== undefined) {
    do { stickerIdx = Math.floor(Math.random() * stickers.length); } while (stickerIdx === lastMsg.stickerIdx);
  } else {
    stickerIdx = Math.floor(Math.random() * stickers.length);
  }
  var _sMsg = { from: 'dream', senderId: senderId, senderAvatar: senderAvatar, text: '[表情]', stickerIdx: stickerIdx, stickerData: stickers[stickerIdx], time: Date.now() };
  if (autoQuote) _sMsg.quote = autoQuote;
  chatMessages.push(_sMsg);
} else {
  var _tMsg = { from: 'dream', senderId: senderId, senderAvatar: senderAvatar, text: '…', time: Date.now() };
  if (autoQuote) _tMsg.quote = autoQuote;
  chatMessages.push(_tMsg);
}

// ===== 梦角随机撤回自己发的消息（3% 概率）=====
var _lastMsg = chatMessages[chatMessages.length - 1];
var _chatIdAtSend = state.currentChatId;
if (_lastMsg && _lastMsg.from === 'dream' && Math.random() < 0.03) {
  var _withdrawSenderName = '';
  if (isGroup && _lastMsg.senderId) {
    _withdrawSenderName = getDreamName(_lastMsg.senderId);
  } else {
    var _wd = state.dreams.find(function(d){ return d.id === _chatIdAtSend; });
    _withdrawSenderName = _wd ? _wd.name : '梦角';
  }
  setTimeout(function() {
    if (state.currentChatId !== _chatIdAtSend) return;
    var _idx = chatMessages.indexOf(_lastMsg);
    if (_idx > -1 && chatMessages[_idx] === _lastMsg) {
      chatMessages[_idx] = { from: 'system', text: '「' + _withdrawSenderName + '」撤回了一条消息', time: Date.now() };
      saveChatMessages();
      renderChatMessages();
    }
  }, 3000 + Math.random() * 4000);
}
  
  // ===== 梦角主动发红包（5% 概率） =====
  if (Math.random() < 0.02) {
    var rpSenderId = isGroup ? senderId : state.currentChatId;
    if (rpSenderId) {
      var rpSender = state.dreams.find(function(d) { return d.id === rpSenderId; });
      if (rpSender) {
        var balance = getDreamBalance(rpSenderId);
        if (balance < 0.01) {
          chatMessages.push({ from: 'system', text: '「' + rpSender.name + '」的零花钱已花完，希望你为他充值', time: Date.now() });
        } else {
          var amt = 0.01 + Math.random() * (balance - 0.01);
          amt = Math.floor(amt * 100) / 100;
          if (amt < 0.01) amt = 0.01;
          if (amt > balance) amt = balance;
          setDreamBalance(rpSenderId, balance - amt);

          var usableForRp = getUsableCards(state.currentChatId);
          var rpMsg = usableForRp.length > 0 ? usableForRp[Math.floor(Math.random() * usableForRp.length)].text : '大吉大利，恭喜发财';

          var rpMaxPeople = 1;
          if (isGroup) {
            var rpGroup = state.groups.find(function(x) { return x.id === state.currentChatId; });
            var groupSize = rpGroup ? (rpGroup.memberIds.length + 1) : 2;
            rpMaxPeople = 1 + Math.floor(Math.random() * groupSize);
          }

          var rpPacket = {
            from: 'dream',
            senderId: rpSenderId,
            senderName: rpSender.name,
            type: 'redpacket',
            packetId: 'rp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            totalAmount: amt,
            message: rpMsg,
            maxPeople: rpMaxPeople,
            claimed: [],
            refunded: false,
            chatId: state.currentChatId,
            time: Date.now()
          };
          chatMessages.push(rpPacket);

          if (isGroup) {
            var rpGroup2 = state.groups.find(function(x) { return x.id === state.currentChatId; });
            if (rpGroup2) {
              var rpCandidates = rpGroup2.memberIds.filter(function(id) { return id !== rpSenderId; });
              rpCandidates.forEach(function(id) {
                if (Math.random() < 0.6) {
                  setTimeout(function() {
                    claimRedPacket(rpPacket.packetId, id);
                  }, 1500 + Math.random() * 5000);
                }
              });
            }
          }
        }
      }
    }
  }

   // ===== 梦角主动送礼物（2% 概率） =====
  if (Math.random() < 0.02) {
    var giftSenderId = isGroup ? senderId : state.currentChatId;
    if (giftSenderId) {
      var giftSender = state.dreams.find(function(d) { return d.id === giftSenderId; });
      if (giftSender) {
        var giftBalance = getDreamBalance(giftSenderId);
        var giftList = getGiftItems();
        if (giftList.length > 0) {
          var pickedGift = giftList[Math.floor(Math.random() * giftList.length)];
          var count = 1 + Math.floor(Math.random() * 3);
          var totalCost = Math.floor(pickedGift.price * count * 100) / 100;

          if (giftBalance < totalCost) {
            chatMessages.push({ from: 'system', text: '「' + giftSender.name + '」的零花钱不够买礼物了，希望你为他充值', time: Date.now() });
          } else {
            setDreamBalance(giftSenderId, giftBalance - totalCost);
            var giftPacket = {
              from: 'dream',
              senderId: giftSenderId,
              senderName: giftSender.name,
              type: 'gift',
              packetId: 'gf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              giftName: pickedGift.name,
              unitPrice: pickedGift.price,
              count: count,
              totalPrice: totalCost,
              claimed: [],
              refunded: false,
              chatId: state.currentChatId,
              time: Date.now()
            };
            chatMessages.push(giftPacket);
          }
        }
      }
    }
  } 

    // 梦角主动发问卷（5% 概率）
  maybeSendQuizQuestion(senderId);

  // ===== 梦角主动转发与其他梦角的聊天记录（5% 概率） =====
  if (Math.random() < 0.05 && state.dreams && state.dreams.length >= 2) {
    var otherDreams = state.dreams.filter(function(d) { return d.id !== senderId && d.id !== state.currentChatId; });
    var dreamA = state.dreams.find(function(d) { return d.id === senderId; });
    if (!dreamA) dreamA = state.dreams[0];
    
    if (otherDreams.length > 0) {
      var dreamB = otherDreams[Math.floor(Math.random() * otherDreams.length)];
      
      var fakeMsgs = [];
      var count = 5 + Math.floor(Math.random() * 21); // 5到25条
      var lastSender = null;
      
      for (var fi = 0; fi < count; fi++) {
        var currentSender = Math.random() < 0.5 ? dreamA : dreamB;
        if (lastSender && currentSender.id === lastSender.id) {
           currentSender = currentSender.id === dreamA.id ? dreamB : dreamA;
        }
        lastSender = currentSender;
        
        var textOrSticker = Math.random();
        if (textOrSticker < 0.15) { // 15% 概率发表情包
          var stkList = getAllStickers();
          if (stkList.length > 0) {
            var pickedStk = stkList[Math.floor(Math.random() * stkList.length)].data;
            fakeMsgs.push({ from: 'dream', senderId: currentSender.id, senderName: currentSender.name, senderAvatar: currentSender.avatar, text: '[表情]', stickerData: pickedStk });
            continue;
          }
        }
        
        var usable = getUsableCards(currentSender.id);
        var txt = '……';
        if (usable.length > 0) {
          txt = usable[Math.floor(Math.random() * usable.length)].text;
        }
        fakeMsgs.push({ from: 'dream', senderId: currentSender.id, senderName: currentSender.name, senderAvatar: currentSender.avatar, text: txt });
      }
      
      var fwPacket = {
        from: 'dream',
        senderId: senderId,
        senderName: dreamA.name,
        chatTitle: dreamA.name + ' 和 ' + dreamB.name + ' 的聊天记录',
        type: 'forward',
        messages: fakeMsgs,
        preview: fakeMsgs[0] ? fakeMsgs[0].text : '聊天记录',
        time: Date.now()
      };
      
      chatMessages.push(fwPacket);
    }
  }
  // ===== 结束 =====

  renderChatMessages();
saveChatMessages();
// 【修复】：找到真正的发件人名字
var notifyName = '梦角';
if (isGroup && senderId) {
  var notifyMember = state.dreams.find(function(d) { return d.id === senderId; });
  if (notifyMember) notifyName = notifyMember.name;
} else if (state.currentChatId) {
  var notifyDream = state.dreams.find(function(d) { return d.id === state.currentChatId; });
  if (notifyDream) notifyName = notifyDream.name;
}
sendNotification(notifyName, '发来一条消息', state.currentChatId);
}

// ===== AI 群主的管理行为 =====
// ===== AI 群主的管理行为 =====
function aiGroupOwnerAction(g) {
  var owner = state.dreams.find(function(d) { return d.id === g.ownerId; });
  if (!owner) return;

  var otherMembers = g.memberIds.filter(function(id) { return String(id) !== String(g.ownerId); });
  if (Math.random() < 1) otherMembers.push('user');
  var availableDreams = state.dreams.filter(function(d) { return !g.memberIds.includes(d.id); });

  var action = Math.random();
  var sysText = '';
  var targetId = '';
  var target = null;

  if (action < 0.3 && availableDreams.length > 0) {
    var toAdd = availableDreams[Math.floor(Math.random() * availableDreams.length)];
    g.memberIds.push(toAdd.id);
    sysText = '群主「' + owner.name + '」邀请了「' + toAdd.name + '」加入群聊';
  } else {
    if (otherMembers.length === 0) return;
    targetId = otherMembers[Math.floor(Math.random() * otherMembers.length)];
    if (targetId === 'user') {
  target = { id: 'user', name: state.profile.name || '我' };
} else {
  target = state.dreams.find(function(d) { return d.id === targetId; });
}
if (!target) return;

    // 让 AI 有概率把群主转让给用户
if (Math.random() < 1) otherMembers.push('user');
    var subAction = Math.random();
    if (subAction < 0.25) {
      if (!g.muteEndsAt) g.muteEndsAt = {};
      if (g.muteEndsAt[String(targetId)] !== undefined) return; 
      var durations = [5, 10, 15, 30];
      var mins = durations[Math.floor(Math.random() * durations.length)];
      g.muteEndsAt[String(targetId)] = Date.now() + mins * 60 * 1000; // 强制转字符串
      sysText = '群主「' + owner.name + '」禁言了「' + target.name + '」' + mins + '分钟';
    } else if (subAction < 0.5) {
      g.memberIds = g.memberIds.filter(function(id) { return String(id) !== String(targetId); });
      if (g.muteEndsAt) delete g.muteEndsAt[String(targetId)];
      sysText = '群主「' + owner.name + '」将「' + target.name + '」移出了群聊';
    } else {
      g.ownerId = targetId;
      sysText = '群主「' + owner.name + '」已将群主转让给「' + target.name + '」';
    }
  }

  if (sysText) {
    if (!state.chatSessions[g.id]) state.chatSessions[g.id] = [];
    state.chatSessions[g.id].push({ from: 'system', text: sysText, time: Date.now() });
    saveState();
  }

  if (state.currentChatId === g.id) {
    loadChatMessages();
    renderChatMessages();
  }
}

function renderChat() {
  var chatBody = document.getElementById('chatBody');
  var isGroup = state.currentChatId && state.currentChatId.startsWith('group_');
  var bg = null;

  if (isGroup) {
    var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
       bg = g && g.chatBg ? g.chatBg : (state.settings ? state.settings.globalChatBg : null);
  } else {
    var cs = getCurrentChatSettings();
    bg = cs.bg || (state.settings ? state.settings.globalChatBg : null);
  }

    // 背景图挂到整页，让顶部栏也能透出背景
  var pageEl = document.getElementById('pagePrivateChat');
  if (pageEl) {
    if (bg) {
      pageEl.style.background = 'url("' + bg + '") center/cover no-repeat';
    } else {
      pageEl.style.background = '';
    }
  }
  if (chatBody) {
    chatBody.style.background = 'transparent';
    chatBody.style.backgroundColor = 'transparent';
  }

  if (isGroup) {
    var g2 = state.groups.find(function(item) { return item.id === state.currentChatId; });
    if (g2) document.getElementById('chatHeaderName').textContent = g2.name + ' (' + g2.memberIds.length + ')';
  } else {
    var d = state.dreams.find(function(item) { return item.id === state.currentChatId; });
    if (d) document.getElementById('chatHeaderName').textContent = d.name + (d.currentStatus ? ' · ' + d.currentStatus : '');
  }

  // ===== 更新通话横条（只有被邀请才显示） =====
  // ===== 更新通话横条（只要有人在通话就显示横幅，但按钮只对被邀请者显示） =====
  var banner = document.getElementById('activeCallBanner');
  if (banner) {
    var bannerCall = null;
    if (state.currentChatId && state.currentChatId.startsWith('group_') && state.activeCalls) {
      for (var bi = 0; bi < state.activeCalls.length; bi++) {
        var c = state.activeCalls[bi];
        if (c.chatId === state.currentChatId && c.participants.indexOf('user') === -1) {
          bannerCall = c; break;
        }
      }
    }
    if (bannerCall) {
      var names = bannerCall.participants.map(function(id) { return getDreamName(id); }).join('、');
      document.getElementById('activeCallBannerText').textContent = '📞 ' + names + ' 正在通话中';
      banner.style.display = 'flex';
      // 只有被邀请时，才显示「加入」按钮
      var joinBtn = document.getElementById('activeCallJoinBtn');
      if (joinBtn) {
        if (bannerCall.invited && bannerCall.invited.indexOf('user') > -1) {
          joinBtn.style.display = 'inline-block';
        } else {
          joinBtn.style.display = 'none';
        }
      }
    } else {
      banner.style.display = 'none';
    }
  }

  renderChatMessages(); // 
} // 

function loadChatSettings() {
  try {
    var saved = localStorage.getItem('dreamChatSettings');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return { bg: null, bubbleUser: '#e8e8ed', bubbleDream: '#e8e8ed', fontColor: '#1d1d1f' };
}
function saveChatSettings() {
  var cs = getCurrentChatSettings();
  cs.bubbleUser = document.getElementById('bubbleUserColor').value;
  cs.bubbleDream = document.getElementById('bubbleDreamColor').value;
  cs.fontColor = document.getElementById('chatFontColor').value;

  var specificCSS = document.getElementById('chatSpecificCSS');
  if (specificCSS && state.currentChatId) {
    state.chatCustomStyles[state.currentChatId] = specificCSS.value;
  }
  
  saveState();
  showToast('聊天设置已保存');
  renderChatMessages();
  renderChat();
}
function resetChatSettings() {
  var cs = getCurrentChatSettings();
  cs.bg = null;
  cs.bubbleUser = '#e8e8ed';
  cs.bubbleDream = '#e8e8ed';
  cs.fontColor = '#1d1d1f';
  cs.readNoReply = false;
  
  state.chatCustomStyles[state.currentChatId] = '';
  saveState();
  initReadNoReplyToggle();
  
  initChatBeautifyPages();
  renderChatMessages();
  renderChat();
  showToast('已重置为默认');
}
function handleChatBg(e) {
  var file = e.target.files[0];
  if (!file) return;
  
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    
    // 先绑定加载完成事件，再赋值 src，确保万无一失
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX_WIDTH = 800; 
      var width = img.width;
      var height = img.height;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      var compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);

            try {
        var cs = getCurrentChatSettings();
        cs.bg = compressedDataUrl;
        saveState();
        showToast('聊天背景已设置');
        
        // 顺手更新设置页面的预览
        var chatBgStatus = document.getElementById('chatBgStatus');
        if (chatBgStatus) chatBgStatus.textContent = '已设置 ✓';
        var chatBgPreview = document.getElementById('chatBgPreview');
        if (chatBgPreview) {
          chatBgPreview.style.display = 'block';
          chatBgPreview.style.background = 'url(' + compressedDataUrl + ') center/cover';
        }
      } catch(err) {
        showToast('存储空间不足，请换一张更小的图');
      }
    };
    
    img.onerror = function() {
        showToast('图片加载失败，请重试');
    };
    
    // 现在才赋值 src
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}
function confirmClearChat() {
  if (confirm('确定清除所有聊天记录？此操作不可恢复！')) {
    chatMessages = [];
    saveChatMessages();
    renderChatMessages();
    showToast('聊天记录已清除');
  }
}

function toggleStickerPanel() {
  var panel = document.getElementById('stickerPanel');
  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'block';
    renderStickers();
  } else {
    panel.style.display = 'none';
  }
}

// ===== 表情包功能完整版 =====

function toggleStickerEditMode() {
  isEditingStickers = !isEditingStickers;
  renderStickers();
}

var isEditingStickers = false;

function renderStickers() {
  var panel = document.getElementById('stickerPanel');
  if (!panel) return;

  if (state.settings && state.settings.currentStickerGroupId) {
    currentStickerGroupId = state.settings.currentStickerGroupId;
  }

  var html = '';

  html += '<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid var(--border);flex-shrink:0;position:sticky;top:0;background:var(--card);z-index:5;-webkit-overflow-scrolling:touch;">';
  stickerGroups.forEach(function(g) {
    var active = g.id === currentStickerGroupId;
    html += '<span onclick="switchStickerGroup(\'' + g.id + '\')" style="flex-shrink:0;padding:6px 16px;border-radius:16px;font-size:13px;cursor:pointer;background:' + (active ? 'var(--blue)' : '#f0f0f5') + ';color:' + (active ? '#fff' : 'var(--text)') + ';white-space:nowrap;">' + g.name + '</span>';
  });
  html += '</div>';

  var currentGroup = getCurrentStickerGroup();
  var items = currentGroup ? (currentGroup.items || []) : [];

  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
  html += '<span style="font-size:12px;color:var(--gray);">' + (isEditingStickers ? '点击表情删除' : '表情包') + '</span>';
  html += '<button onclick="toggleStickerEditMode()" style="font-size:12px;padding:2px 10px;border-radius:10px;border:1px solid var(--border);background:' + (isEditingStickers ? 'var(--red)' : 'var(--card)') + ';color:' + (isEditingStickers ? '#fff' : 'var(--blue)') + ';">' + (isEditingStickers ? '完成' : '编辑') + '</button>';
  html += '</div>';

  html += '<div style="display:flex;flex-wrap:wrap;gap:8px;padding:4px;">';
  if (items.length === 0) {
    html += '<div style="width:100%;text-align:center;color:var(--gray);font-size:13px;padding:20px;">这个分组还没有表情包<br><span style="font-size:11px;">去主屏幕的「表情包」图标里添加</span></div>';
  } else {
    for (var i = 0; i < items.length; i++) {
      html += '<div class="sticker-item" style="position:relative;width:60px;height:60px;flex-shrink:0;">';
      if (isEditingStickers) {
        html += '<img src="' + items[i] + '" style="width:60px;height:60px;max-width:60px;max-height:60px;object-fit:contain;display:block;opacity:0.5;pointer-events:none;">';
        html += '<span onclick="deleteStickerFromChatPanel(\'' + currentStickerGroupId + '\',' + i + ')" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--red);color:#fff;font-size:14px;text-align:center;line-height:20px;cursor:pointer;z-index:10;">×</span>';
      } else {
        html += '<img src="' + items[i] + '" onclick="sendStickerFromGroup(\'' + currentStickerGroupId + '\',' + i + ')" style="width:60px;height:60px;max-width:60px;max-height:60px;object-fit:contain;display:block;cursor:pointer;">';
      }
      html += '</div>';
    }
  }
  html += '</div>';

  panel.innerHTML = html;
}

function switchStickerGroup(groupId) {
  currentStickerGroupId = groupId;
  if (!state.settings) state.settings = {};
  state.settings.currentStickerGroupId = groupId;
  saveState();
  renderStickers();
}

function deleteStickerFromChatPanel(groupId, itemIdx) {
  var g = stickerGroups.find(function(x) { return x.id === groupId; });
  if (!g) return;
  g.items.splice(itemIdx, 1);
  saveStickerGroups();
  renderStickers();
  renderChatMessages();
  showToast('表情包已删除');
}

function sendStickerFromGroup(groupId, itemIdx) {
  if (isSendingSticker) return;
  var g = stickerGroups.find(function(x) { return x.id === groupId; });
  if (!g || !g.items[itemIdx]) return;
  isSendingSticker = true;
  setTimeout(function() { isSendingSticker = false; }, 500);

  chatMessages.push({ from: 'user', text: '[表情]', time: Date.now(), stickerData: g.items[itemIdx] });
  document.getElementById('chatInput').value = '';
  renderChatMessages();
  saveChatMessages();
  document.getElementById('stickerPanel').style.display = 'none';
  scheduleAiReply();
}

function addSticker(e) {
  var files = e.target.files;
  if (!files || files.length === 0) return;
  
  var totalFiles = files.length;
  var newStickers = [];
  
  showToast('正在处理 ' + totalFiles + ' 张图片...');
  
  function processFile(file) {
    return new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var MAX_SIZE = 200;
          var width = img.width;
          var height = img.height;
          
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          var compressedDataUrl = canvas.toDataURL('image/png');
          newStickers.push(compressedDataUrl);
          resolve();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  
  var promises = [];
  for (var i = 0; i < totalFiles; i++) {
    promises.push(processFile(files[i]));
  }
  
  Promise.all(promises).then(function() {
    stickers = stickers.concat(newStickers);
    try {
      localStorage.setItem('dreamStickers', JSON.stringify(stickers));
      renderStickers();
      showToast('成功添加 ' + newStickers.length + ' 个表情包');
    } catch (err) {
      showToast('存储空间不足，请删除一些旧表情包');
    }
  });
  
  e.target.value = '';
}

function deleteSticker(idx) {
  // 直接删除，不再弹系统确认框
  stickers.splice(idx, 1);
  try {
    localStorage.setItem('dreamStickers', JSON.stringify(stickers));
  } catch(e) {}
  renderStickers();
  renderChatMessages();
  showToast('表情包已删除');
}

function setupChatBg() {
  // 绑在 HTML 上了，不用再绑
}

// ===== TOAST =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ===== RENDER ALL =====
function renderAll() {
  renderWordCards();
  renderDreamRoles();
  renderChatList();
  // 删掉了 loadProfileForm，因为“我”的页面现在由 switchWeChatTab 负责渲染
}

// ===== START =====
init();

// Handle clicks on overlay background
document.querySelectorAll('.overlay-bg').forEach(bg => {
  bg.addEventListener('click', function(e) {
    e.stopPropagation();
  });
});

console.log('💜 Mind已启动！');
// ===== 外观美化的保存与重置 =====
// ===== 保存美化设置（增强版） =====
function saveBeautySettings() {
  var fontSize = document.getElementById('globalFontSize').value;
  var themeColor = document.getElementById('themeColor').value;

  // 保存高级美化设置（字体、主题）
  if (!state.settings) state.settings = {};
  state.settings.fontSize = fontSize;
  state.settings.themeColor = themeColor;
  saveState();

  // 立刻应用效果
  applyBeautySettings();

  showToast('美化设置已保存并生效！');
}

// ===== 恢复默认 =====
function resetBeautySettings() {
  if (state.settings) {
    state.settings.customIcons = {}; 
    state.settings.fontSize = 14;
    state.settings.themeColor = '#007aff';
    saveState();
    renderAppIcons();
    renderIconSettings();
  }

  document.getElementById('globalFontSize').value = 14;
  document.getElementById('fontSizeLabel').textContent = 14;
  document.getElementById('themeColor').value = '#007aff';

  applyBeautySettings();
  showToast('已恢复默认');
}

// ===== 应用美化效果（核心逻辑） =====
function applyBeautySettings() {
  if (!state.settings) return;
  
  var fontSize = state.settings.fontSize || 14;
  var ratio = fontSize / 14;
  
  // 缩放所有文字
  document.querySelectorAll('.phone, .phone *').forEach(function(el) {
    if (!el.dataset.origFs) {
      el.dataset.origFs = parseFloat(window.getComputedStyle(el).fontSize) || 14;
    }
    var origFs = parseFloat(el.dataset.origFs);
    if (origFs) el.style.fontSize = (origFs * ratio) + 'px';
  });
  
  // 主题颜色
  var themeColor = state.settings.themeColor || '#007aff';
  document.documentElement.style.setProperty('--blue', themeColor);
}

// ===== 导入 milk 字卡（自动识别分组终极版） =====
function handleImportCards(e) {
  var file = e.target.files[0];
  if (!file) return;

  var currentOwner = window._currentCardOwner || 'all'; // 获取当前归属

  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      var newCards = [];

      function looksLikeCard(s) {
        if (!s || typeof s !== 'string') return false;
        s = s.trim();
        if (s.length === 0 || s.length > 500) return false;
        if (/^[\s\W\d]+$/.test(s)) return false;
        if (/^https?:\/\//i.test(s)) return false;
        if (/^data:/i.test(s)) return false;
        if (/^\d{10,}$/.test(s)) return false;
        return true;
      }

      var visited = 0;
      function scan(node, currentGroupName) {
        if (visited > 20000) return;
        visited++;
        if (node == null) return;

        if (typeof node === 'string') {
          if (looksLikeCard(node)) {
            newCards.push({ text: node.trim(), groupName: currentGroupName || '' });
          }
          return;
        }

        if (Array.isArray(node)) {
          node.forEach(function(item) { scan(item, currentGroupName); });
          return;
        }

        if (typeof node === 'object') {
          var possibleGroupName = currentGroupName;
          var nameKeys = ['name', 'groupName', 'category', 'group', 'title', '分组', '分类'];
          for (var nk = 0; nk < nameKeys.length; nk++) {
            var v = node[nameKeys[nk]];
            if (typeof v === 'string' && v.trim() && v.length < 50) {
              possibleGroupName = v.trim();
              break;
            }
          }

          Object.keys(node).forEach(function(k) {
            var skipKeys = ['id', '_id', 'uid', 'uuid', 'version', 'createdAt', 'updatedAt', 'timestamp', 'date', 'time'];
            if (skipKeys.indexOf(k) > -1) return;
            scan(node[k], possibleGroupName);
          });
        }
      }

      if (data.customReplyGroups && Array.isArray(data.customReplyGroups)) {
        data.customReplyGroups.forEach(function(group) {
          var catName = (group && group.name) ? String(group.name).trim() : '未命名分组';
          var items = (group && group.items) ? group.items : [];
          if (Array.isArray(items)) {
            items.forEach(function(text) {
              if (text && typeof text === 'string' && text.trim() !== '') {
                newCards.push({ text: text.trim(), groupName: catName });
              }
            });
          }
        });
      }

      if (newCards.length === 0 && data.customReplies && Array.isArray(data.customReplies)) {
        data.customReplies.forEach(function(text) {
          if (text && typeof text === 'string' && text.trim() !== '') {
            newCards.push({ text: text.trim(), groupName: '' });
          }
        });
      }

      if (newCards.length === 0) {
        scan(data, '');
      }

      if (newCards.length === 0) {
        showToast('没有找到可导入的字卡数据');
        return;
      }

      var seen = {};
      var uniqueCards = [];
      newCards.forEach(function(c) {
        var key = c.text;
        if (!seen[key]) {
          seen[key] = true;
          uniqueCards.push(c);
        }
      });

      // 【核心修改】：只查找当前归属下的分类
      var groupNameToId = {};
      state.categories.forEach(function(cat) {
        if ((cat.dreamId || 'all') === currentOwner) {
          groupNameToId[cat.name] = cat.id;
        }
      });

      var defaultCatId = null;
      for (var k in groupNameToId) {
        defaultCatId = groupNameToId[k];
        break;
      }
      if (!defaultCatId) {
        // 如果当前归属连分类都没有，建一个默认分类
        defaultCatId = 'cat_' + Date.now();
        state.categories.push({ id: defaultCatId, name: '默认', collapsed: false, dreamId: currentOwner });
        groupNameToId['默认'] = defaultCatId;
      }

      uniqueCards.forEach(function(c) {
        if (!c.groupName) {
          c._catId = defaultCatId;
          return;
        }
        if (!groupNameToId[c.groupName]) {
          var newCatId = 'cat_imported_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
          // 新建分类带上当前归属
          state.categories.push({ id: newCatId, name: c.groupName, collapsed: false, dreamId: currentOwner });
          groupNameToId[c.groupName] = newCatId;
        }
        c._catId = groupNameToId[c.groupName];
      });

      // 当前归属的所有字卡文本（用于去重比对）
      var existingTexts = new Set();
      state.cards.forEach(function(c) {
        if ((c.dreamId || 'all') === currentOwner) {
          existingTexts.add(c.text);
        }
      });

      var addedCount = 0;
      uniqueCards.forEach(function(c) {
        if (existingTexts.has(c.text)) return;
        state.cards.push({
          id: 'imported_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          text: c.text,
          cat: c._catId,
          dreamId: currentOwner // 👈 导入时带上归属
        });
        existingTexts.add(c.text);
        addedCount++;
      });

      if (addedCount > 0) {
        saveState();
        renderWordCards();
        showToast('成功导入 ' + addedCount + ' 张字卡到当前归属');
      } else {
        showToast('当前归属下所有字卡都已存在');
      }

    } catch (err) {
      showToast('文件解析失败，请确认是有效的 JSON 格式');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ===== 3. 处理图标上传并自动裁剪成 1:1 =====
function handleIconUpload(event, key) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = new Image();
    img.onload = function() {
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
     const compressedDataUrl = canvas.toDataURL('image/png');
      
      if (!state.settings.customIcons) state.settings.customIcons = {};
      state.settings.customIcons[key] = compressedDataUrl;
      saveState();
      renderIconSettings();
      renderAppIcons();
      showToast('图标已更新（已自动裁剪为1:1）');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}
// ===== 修复表情包历史记录消失问题（终极版） =====
var isSendingSticker = false;

function sendSticker(idx) {
  if (isSendingSticker) return; 
  if (!stickers[idx]) return;
  
  isSendingSticker = true; 
  setTimeout(function() { isSendingSticker = false; }, 500); 

  chatMessages.push({ from: 'user', text: '[表情]', time: Date.now(), stickerIdx: idx, stickerData: stickers[idx] });
  document.getElementById('chatInput').value = '';
  renderChatMessages();
  saveChatMessages();
  document.getElementById('stickerPanel').style.display = 'none';
  
  // 【核心修复】：使用全局闹钟！这样禁言时才能把它一并取消！
    scheduleAiReply();
}

function renderChatMessages() {
  // 1. 终极护甲
  if (!chatMessages || !Array.isArray(chatMessages)) {
    chatMessages = [];
  }
  chatMessages = chatMessages.filter(function(m) { return m && m.from !== undefined; });

    // 注入当前聊天的专属 CSS
  var userStyleEl = document.getElementById('userCustomStyle');
  if (userStyleEl) {
      if (state.currentChatId && state.chatCustomStyles[state.currentChatId]) {
    userStyleEl.innerHTML = state.chatCustomStyles[state.currentChatId];
  } else if (state.settings && state.settings.globalChatCSS) {
    userStyleEl.innerHTML = state.settings.globalChatCSS;
  } else {
    userStyleEl.innerHTML = '';
  }
  }

  var container = document.getElementById('chatMessages');
  if (!container) return;
  if (chatMessages.length === 0) {
    container.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#86868b;font-size:14px;">开始和梦角聊天吧</div>';
    return;
  }
  var html = '';
  var currentStyle = chatSettings.bubbleStyle || 'default';
  var styleClass = 'bubble-' + currentStyle;
  var useInlineStyle = (currentStyle === 'default');
  var isGroup = state.currentChatId && state.currentChatId.startsWith('group_');

  for (var i = 0; i < chatMessages.length; i++) {
    var m = chatMessages[i];
    if (!m || !m.from) continue;

    var time = new Date(m.time);
    var h = time.getHours();
    var min = time.getMinutes();
    if (h < 10) h = '0' + h;
    if (min < 10) min = '0' + min;
    var timeStr = h + ':' + min;

           // ===== 五子棋邀请卡片 =====
    if (m.type === 'gomoku_invite') {
      var matchNow = state.gomokuAiMatches.find(x => x.id === m.matchId);
      var isEnded = !matchNow || !matchNow.active;
      
      var invHtml = '<div data-msg-index="' + i + '" style="display:flex;justify-content:flex-start;margin-bottom:10px;">';
      invHtml += '<div style="width:240px;background:linear-gradient(135deg,#f5f5f7,#e8e8ed);border-radius:12px;padding:16px;box-shadow:0 4px 14px rgba(0,0,0,0.08);border:1px solid rgba(255,255,255,0.7);">';
      // 👇 去掉了 ⚔️，换成纯文字标题
      invHtml += '<div style="display:flex;align-items:center;margin-bottom:10px;"><span style="font-size:14px;font-weight:600;color:#1d1d1f;">对局邀请</span></div>';
      invHtml += '<div style="font-size:14px;color:#333;line-height:1.5;margin-bottom:12px;">「' + m.p1Name + '」和「' + m.p2Name + '」正在五子棋对弈！</div>';
      
      if (isEnded) {
        invHtml += '<div style="text-align:center;font-size:12px;color:#888;padding-top:10px;border-top:1px solid rgba(0,0,0,0.05);">对局已结束</div>';
      } else {
        invHtml += '<button onclick="enterSpectateMode(\'' + m.matchId + '\')" style="width:100%;padding:8px;border:none;background:#007aff;color:#fff;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600;">去观战</button>';
      }
      invHtml += '</div></div>';
      html += invHtml;
      continue;
    }

        // ===== 五子棋结局卡片 =====
    if (m.type === 'gomoku_result') {
      var p1Col = m.p1Color === 1 ? '黑棋' : '白棋';
      var p2Col = m.p2Color === 1 ? '黑棋' : '白棋';
      
      var resHtml = '<div data-msg-index="' + i + '" style="display:flex;justify-content:flex-start;margin-bottom:10px;">';
      resHtml += '<div style="width:240px;background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 4px 14px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.05);">';
      // 👇 去掉了 🏆，换成纯文字
      resHtml += '<div style="display:flex;align-items:center;margin-bottom:10px;"><span style="font-size:14px;font-weight:600;color:#1d1d1f;">五子棋战报</span></div>';
      
      // 👇 补充显示黑白棋信息
      resHtml += '<div style="font-size:13px;color:#333;margin-bottom:4px;">' + m.p1Name + '（' + p1Col + '） vs ' + m.p2Name + '（' + p2Col + '）</div>';
      resHtml += '<div style="font-size:12px;color:#007aff;font-weight:600;margin-bottom:8px;">胜者：' + m.winnerName + '</div>';
      
      var mSec = Math.floor(m.duration / 60);
      var sSec = m.duration % 60;
      resHtml += '<div style="font-size:11px;color:#86868b;margin-bottom:10px;">耗时：' + mSec + '分' + sSec + '秒</div>';
      
      if (m.boardSnapshot) {
        resHtml += '<img src="' + m.boardSnapshot + '" style="width:100%;border-radius:8px;border:1px solid #e5e5ea;">';
      }
      
      resHtml += '</div></div>';
      html += resHtml;
      continue;
    }

    // 2. 系统消息（最高优先级）
    // 转发卡片
    if (m.type === 'forward') {
      var isMineF = m.from === 'user';
      var avF = isMineF ? (state.profile.avatar || '') : (() => { var s = state.dreams.find(d => d.id === m.senderId) || state.dreams.find(d => d.id === state.currentChatId); return s ? (s.avatar || '') : ''; })();
      
      var fwHtml = '<div data-msg-index="' + i + '" style="display:flex;justify-content:' + (isMineF ? 'flex-end' : 'flex-start') + ';align-items:flex-start;gap:8px;margin-bottom:10px;">';
      if (!isMineF) fwHtml += '<img src="' + avF + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;">';
      
      fwHtml += '<div style="max-width:70%;">';
      fwHtml += '<div onclick="openForwardDetail(' + i + ')" style="cursor:pointer;width:210px;background:linear-gradient(135deg,#f5f5f7,#e8e8ed);border-radius:12px;padding:14px 16px;color:#333;box-shadow:0 4px 14px rgba(0,0,0,0.08);border:1px solid rgba(255,255,255,0.7);">';
      
      var cardTitle = m.chatTitle || (isMineF ? '我的聊天记录' : (m.senderName || '梦角') + ' 的聊天记录');
      
      fwHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;overflow:hidden;"><svg style="flex-shrink:0;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><span style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + cardTitle + '</span></div>';
      fwHtml += '<div style="font-size:12px;color:#666;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (m.preview || '') + '</div>';
      fwHtml += '<div style="font-size:11px;color:#888;margin-top:6px;">' + (m.messages ? m.messages.length : 0) + ' 条消息</div>';
      fwHtml += '</div>';
      
      fwHtml += '<span style="font-size:9px;color:#b0b0b0;display:block;' + (isMineF ? 'text-align:right;' : '') + 'margin-top:4px;">' + timeStr + '</span>';
      fwHtml += '</div>';
      
      if (isMineF) fwHtml += '<img src="' + avF + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;">';
      fwHtml += '</div>';
      html += fwHtml;
      continue;
    }

    // 强行拦截日程卡片
        if (m.type === 'schedule') {
      var isMe = (m.from === 'user');
      var avSrc = isMe ? (state.profile.avatar || '') : (() => {
        var s = state.dreams.find(d => d.id === m.senderId) || state.dreams.find(d => d.id === state.currentChatId);
        return s ? (s.avatar || '') : 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2716%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2716%27 y=%2720%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2712%27%3E💜%3C/text%3E%3C/svg%3E';
      })();

      var schHtml = '<div data-msg-index="' + i + '" style="display:flex;justify-content:' + (isMe ? 'flex-end' : 'flex-start') + ';align-items:flex-start;gap:8px;margin-bottom:10px;">';
      if (!isMe) schHtml += '<img src="' + avSrc + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;">';
      
      schHtml += '<div style="max-width:70%;display:flex;flex-direction:column;">';
      schHtml += '<div style="width:230px;background:rgba(255,255,255,0.75);backdrop-filter:blur(15px);border-radius:12px;padding:16px;box-shadow:0 4px 14px rgba(0,0,0,0.08);border:1px solid rgba(255,255,255,0.8);">';
      schHtml += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span style="font-size:14px;font-weight:600;color:#1d1d1f;">日程提醒</span></div>';
      schHtml += '<div style="font-size:15px;font-weight:600;color:#333;margin-bottom:4px;">' + (m.title || '日程') + '</div>';
      schHtml += '<div style="font-size:12px;color:#86868b;margin-bottom:14px;">⏰ ' + (m.timeStr || '') + '</div>';
      
      if (m.cardStatus === 'done') {
         schHtml += '<div style="text-align:center; font-size:13px; font-weight:600; color:#34c759; padding-top:10px; border-top:1px solid rgba(0,0,0,0.05);">知道了 ✓</div>';
      } else if (m.cardStatus === 'later') {
         schHtml += '<div style="text-align:center; font-size:13px; font-weight:600; color:#ff9500; padding-top:10px; border-top:1px solid rgba(0,0,0,0.05);">稍后提醒 ✓</div>';
      } else {
         schHtml += '<div style="display:flex;gap:8px;border-top:1px solid rgba(0,0,0,0.05);padding-top:10px;">';
         schHtml += '<button onclick="schCardLater(\'' + m.packetId + '\')" style="flex:1;padding:6px;border:1px solid #e5e5ea;background:transparent;border-radius:8px;font-size:12px;color:#555;cursor:pointer;">稍后提醒</button>';
         schHtml += '<button onclick="schCardDone(\'' + m.packetId + '\')" style="flex:1;padding:6px;border:none;background:#007aff;color:#fff;border-radius:8px;font-size:12px;cursor:pointer;">知道了</button>';
         schHtml += '</div>';
      }
      schHtml += '</div></div>';
      
      if (isMe) schHtml += '<img src="' + avSrc + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;">';
      schHtml += '</div>';
      html += schHtml;
      continue;
    }
    // 拦截结束

        if (m.type === 'report_notice') {
      var lines = (m.text || '').split('\n');
      html += '<div style="margin:14px 0;padding:12px 14px;background:rgba(250,81,81,0.08);border:1px solid rgba(250,81,81,0.3);border-radius:12px;font-size:12px;color:#c0392b;line-height:1.7;white-space:pre-wrap;">';
      html += lines.join('<br>');
      html += '</div>';
      continue;
    }
    if (m.from === 'system') {
      html += '<div style="text-align:center;margin:12px 0;font-size:12px;color:#86868b;">' + m.text + '</div>';
      continue; 
    }

    // 问卷卡片
    if (m.type === 'quiz') {

    // 日程提醒卡片
        if (m.type === 'schedule') {
      var schHtml = '<div data-msg-index="' + i + '" style="display:flex;justify-content:flex-start;margin-bottom:10px;">';
      schHtml += '<div style="width:230px;background:rgba(255,255,255,0.75);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);border-radius:12px;padding:16px;box-shadow:0 4px 14px rgba(0,0,0,0.08);border:1px solid rgba(255,255,255,0.8);">';
      schHtml += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">';
      schHtml += '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
      schHtml += '<span style="font-size:14px;font-weight:600;color:#1d1d1f;">日程提醒</span>';
      schHtml += '</div>';
      schHtml += '<div style="font-size:15px;font-weight:600;color:#333;margin-bottom:4px;">' + (m.title || '日程') + '</div>';
      schHtml += '<div style="font-size:12px;color:#86868b;margin-bottom:14px;">⏰ ' + (m.timeStr || '') + '</div>';
      
      // 根据状态判断
      if (m.cardStatus === 'done') {
         schHtml += '<div style="text-align:center; font-size:12px; color:#34c759; padding-top:10px; border-top:1px solid rgba(0,0,0,0.05);">已知道</div>';
      } else if (m.cardStatus === 'later') {
         schHtml += '<div style="text-align:center; font-size:12px; color:#ff9500; padding-top:10px; border-top:1px solid rgba(0,0,0,0.05);">已设置稍后提醒</div>';
      } else {
         schHtml += '<div style="display:flex;gap:8px;border-top:1px solid rgba(0,0,0,0.05);padding-top:10px;">';
         schHtml += '<button onclick="schCardLater(\'' + m.packetId + '\')" style="flex:1;padding:6px;border:1px solid #e5e5ea;background:transparent;border-radius:8px;font-size:12px;color:#555;cursor:pointer;">稍后提醒</button>';
         schHtml += '<button onclick="schCardDone(\'' + m.packetId + '\')" style="flex:1;padding:6px;border:none;background:#007aff;color:#fff;border-radius:8px;font-size:12px;cursor:pointer;">知道了</button>';
         schHtml += '</div>';
      }
      
      schHtml += '</div>';
      schHtml += '</div>';
      html += schHtml;
      continue;
    }

      var isMineQ = m.from === 'user';
      var isMeAsk = m.isMeAsk === true;
      var hasAns = m.answers && m.answers.length > 0;

      var titleText = '问卷';
      var subText = '';
      var actionText = '点击填写 →';

      if (isMeAsk) {
        // 用户向梦角提问
        var answererName = '梦角';
        if (m.answererId) {
          var _dQ = state.dreams.find(function(x) { return x.id === m.answererId; });
          if (_dQ) answererName = _dQ.name;
        }
        titleText = hasAns ? '已回答问卷' : '我提问';
        subText = hasAns
          ? answererName + ' 已回答了你的问题'
          : '我向 ' + answererName + ' 提了 ' + m.questions.length + ' 个问题';
        actionText = hasAns ? '点击查看答案 →' : '等待回答中…';
      } else {
        // 梦角向用户提问
        titleText = hasAns ? '已作答问卷' : '问卷';
        subText = hasAns
          ? '我已回答了 ' + m.askerName + ' 的提问'
          : m.askerName + ' 向你提了 ' + m.questions.length + ' 个问题';
        actionText = hasAns ? '点击查看答案 →' : '点击填写 →';
      }

      var qHtml = '<div data-msg-index="' + i + '" style="display:flex;justify-content:' + (isMineQ ? 'flex-end' : 'flex-start') + ';margin-bottom:10px;">';
      qHtml += '<div onclick="openQuizAnswerModal(\'' + m.packetId + '\')" class="quiz-card-msg">';
      qHtml += '<div style="display:flex;align-items:center;margin-bottom:6px;">';
      qHtml += '<span class="quiz-card-icon" style="display:inline-flex;align-items:center;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/></svg></span>';
      qHtml += '<span class="quiz-card-title">' + titleText + '</span>';
      qHtml += '</div>';
      qHtml += '<div class="quiz-card-sub">' + subText + '</div>';
      qHtml += '<div class="quiz-card-sub" style="margin-top:4px;color:#007aff;">' + actionText + '</div>';
      qHtml += '</div>';
      qHtml += '</div>';
      html += qHtml;
      continue;
    }

    // 备忘录提醒卡片
    if (m.type === 'memo') {
      var mHtml = '<div data-msg-index="' + i + '" style="display:flex;justify-content:flex-start;margin-bottom:10px;">';
      mHtml += '<div onclick="openMemoDetail(\'' + m.packetId + '\')" style="cursor:pointer;width:230px;background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 4px 14px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.05);">';
      mHtml += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">';
      mHtml += '<span style="font-size:20px;">📝</span>';
      mHtml += '<span style="font-size:13px;font-weight:600;color:#1d1d1f;">备忘录提醒</span>';
      mHtml += '</div>';
      var previewMemo = (m.content || '').replace(/\n/g, ' ');
      if (previewMemo.length > 40) previewMemo = previewMemo.slice(0, 40) + '…';
      mHtml += '<div style="font-size:13px;color:#333;line-height:1.5;margin-bottom:8px;word-break:break-word;">' + escapeHtml(previewMemo) + '</div>';
      mHtml += '<div style="font-size:11px;color:#86868b;">⏰ ' + escapeHtml(m.remindAt || '') + '</div>';
      mHtml += '</div>';
      mHtml += '</div>';
      html += mHtml;
      continue;
    }

    // 抉择卡片
        if (m.type === 'choice') {
      var isMineC = m.from === 'user';
      var hasAnsC = !!m.answer;
      var avC = isMineC ? (state.profile.avatar || '') : (() => { var s = state.dreams.find(d => d.id === state.currentChatId); return s ? (s.avatar || '') : ''; })();
      
      var cHtml = '<div data-msg-index="' + i + '" style="display:flex;justify-content:' + (isMineC ? 'flex-end' : 'flex-start') + ';align-items:flex-start;gap:8px;margin-bottom:10px;">';
      if (!isMineC) cHtml += '<img src="' + avC + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;">';
      
      cHtml += '<div style="max-width:70%;width:230px;background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 4px 14px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.05);">';
      cHtml += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" stroke-width="1.8"><line x1="12" y1="3" x2="12" y2="21"/><line x1="5" y1="6" x2="19" y2="6"/><path d="M5 6 2 13a3 3 0 0 0 6 0z"/><path d="M19 6l-3 7a3 3 0 0 0 6 0z"/><line x1="8" y1="21" x2="16" y2="21"/></svg><span style="font-size:13px;font-weight:600;color:#1d1d1f;">抉择</span></div>';
      cHtml += '<div style="font-size:13px;color:#333;line-height:1.5;margin-bottom:10px;">' + escapeHtml(m.question) + '</div>';
      cHtml += '<div style="display:flex;flex-direction:column;gap:6px;">';
      m.options.forEach(function(opt) {
        var isPicked = hasAnsC && m.answer === opt;
        cHtml += '<div style="font-size:12px;padding:6px 10px;border-radius:8px;' + (isPicked ? 'background:rgba(0,122,255,0.12);color:#007aff;font-weight:600;border:1px solid rgba(0,122,255,0.3);' : 'background:#f8f8fa;color:#666;border:1px solid transparent;') + '">' + (isPicked ? '✓ ' : '') + escapeHtml(opt) + '</div>';
      });
      cHtml += '</div>';
      if (!hasAnsC) cHtml += '<div style="font-size:11px;color:#86868b;margin-top:8px;">等待回答中…</div>';
      else cHtml += '<div style="font-size:11px;color:#86868b;margin-top:8px;">' + escapeHtml(m.answererName || '梦角') + ' 选择了</div>';
      cHtml += '</div>';
      
      if (isMineC) cHtml += '<img src="' + avC + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;">';
      cHtml += '</div>';
      html += cHtml;
      continue;
    }

    // 3. 拍一拍消息（第二优先级，直接拦截，绝对不画气泡！）
    if (m.type === 'poke') {
      var pokeSenderName = m.senderName || (m.from === 'user' ? '我' : '梦角');
      if (!m.senderName && m.senderId) {
        var findMember = state.dreams.find(function(d){ return d.id === m.senderId; });
        if (findMember) pokeSenderName = findMember.name;
      }
      html += '<div style="text-align:center;margin:10px 0;font-size:12px;color:#86868b;">';
      html += '<span style="font-weight:600;color:#555;">' + pokeSenderName + '</span> ' + m.text;
      html += '</div>';
      continue; // 拦截成功，跳过后面的气泡渲染
    }
    if (m.type === 'redpacket') {
      var isMine = m.from === 'user';
      var av = isMine ? (state.profile.avatar || '') : (() => { var s = state.dreams.find(d => d.id === m.senderId) || state.dreams.find(d => d.id === state.currentChatId); return s ? (s.avatar || '') : ''; })();
      
      var rpHtml = '<div data-msg-index="' + i + '" style="display:flex;justify-content:' + (isMine ? 'flex-end' : 'flex-start') + ';align-items:flex-start;gap:8px;margin-bottom:10px;">';
      if (!isMine) rpHtml += '<img src="' + av + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;">';
      
      rpHtml += '<div style="max-width:70%;">';
      rpHtml += '<div onclick="openRedPacketDetail(\'' + m.packetId + '\')" style="cursor:pointer;width:210px;background:linear-gradient(135deg,#f5f5f7,#e8e8ed);border-radius:12px;padding:14px 16px;color:#333;box-shadow:0 4px 14px rgba(0,0,0,0.08);border:1px solid rgba(255,255,255,0.7);' + (m.refunded ? 'opacity:0.55;' : '') + '">';
      rpHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><span style="font-size:14px;font-weight:600;">' + (isMine ? '我发的红包' : m.senderName + ' 发的红包') + '</span></div>';
      rpHtml += '<div style="font-size:12px;color:#666;line-height:1.4;">' + m.message + '</div>';
      rpHtml += '<div style="font-size:11px;color:#888;margin-top:6px;">' + (m.refunded ? '已退回' : ('已领 ' + (m.claimed ? m.claimed.length : 0) + '/' + m.maxPeople)) + '</div>';
      rpHtml += '</div></div>';
      
      if (isMine) rpHtml += '<img src="' + av + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;">';
      rpHtml += '</div>';
      html += rpHtml;
      continue;
    }

        if (m.type === 'gift') {
      if (!m.claimed) m.claimed = [];
      var isMineG = m.from === 'user';
      var avG = isMineG ? (state.profile.avatar || '') : (() => { var s = state.dreams.find(d => d.id === m.senderId) || state.dreams.find(d => d.id === state.currentChatId); return s ? (s.avatar || '') : ''; })();
      
      var gHtml = '<div data-msg-index="' + i + '" style="display:flex;justify-content:' + (isMineG ? 'flex-end' : 'flex-start') + ';align-items:flex-start;gap:8px;margin-bottom:10px;">';
      if (!isMineG) gHtml += '<img src="' + avG + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;">';
      
      gHtml += '<div style="max-width:70%;">';
      gHtml += '<div onclick="openGiftDetail(\'' + m.packetId + '\')" style="cursor:pointer;width:210px;background:linear-gradient(135deg,#f5f5f7,#e8e8ed);border-radius:12px;padding:14px 16px;color:#333;box-shadow:0 4px 14px rgba(0,0,0,0.08);border:1px solid rgba(255,255,255,0.7);' + (m.refunded ? 'opacity:0.55;' : '') + '">';
      gHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" stroke-width="1.8"><rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18"/><path d="M12 9v12"/><path d="M12 9c-2 0-4-1.5-4-3.2S10 3 12 5s4-.5 4 2.2S14 9 12 9z"/></svg><span style="font-size:14px;font-weight:600;">' + (isMineG ? '我送的礼物' : m.senderName + ' 送的礼物') + '</span></div>';
      gHtml += '<div style="font-size:13px;color:#333;line-height:1.4;">' + m.giftName + ' ×' + m.count + '</div>';
      gHtml += '<div style="font-size:11px;color:#888;margin-top:6px;">' + formatMoney(m.totalPrice) + ' 元 · ' + (m.refunded ? '已退回' : (m.claimed.length > 0 ? '已领取' : '待领取')) + '</div>';
      gHtml += '</div></div>';
      
      if (isMineG) gHtml += '<img src="' + avG + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;">';
      gHtml += '</div>';
      html += gHtml;
      continue;
    }

    // 4. 提取图片地址
    var imgSrc = '';
    if (m.type === 'image') {
      imgSrc = m.imageData;
    } else if (m.stickerData) {
      imgSrc = m.stickerData; 
    } else if (m.stickerIdx !== undefined && stickers[m.stickerIdx]) {
      imgSrc = stickers[m.stickerIdx]; 
    } else if (m.sticker) {
      imgSrc = m.sticker; 
    }

      var cs = getCurrentChatSettings();
  var finalUser = cs.bubbleUser || (state.settings.globalBubbleUser || '#e8e8ed');
  var finalDream = cs.bubbleDream || (state.settings.globalBubbleDream || '#e8e8ed');
  var finalFont = cs.fontColor || (state.settings.globalFontColor || '#1d1d1f');
  var userBg = useInlineStyle ? 'background:' + finalUser + ';' : '';
  var dreamBg = useInlineStyle ? 'background:' + finalDream + ';' : '';
  var textColor = 'color:' + finalFont + ';';

    // 5. 用户消息气泡
        if (m.from === 'user') {
      html += '<div data-msg-index="' + i + '" style="display:flex;justify-content:flex-end;align-items:flex-end;gap:8px;margin-bottom:6px;">';
      html += '<div style="max-width:70%;">';
      if (imgSrc) {
        html += '<div class="chat-bubble bubble-user ' + styleClass + '" style="' + userBg + textColor + 'padding:4px;"><img src="' + imgSrc + '" style="max-width:120px;max-height:180px;border-radius:6px;object-fit:contain;display:block;"></div>';
      } else {
        html += '<div class="chat-bubble bubble-user ' + styleClass + '" style="' + userBg + textColor + '">' + m.text + '</div>';
      }
      var statusText = m.status === 'read' ? '已读' : '未读';
      html += '<span style="font-size:9px;color:#b0b0b0;display:block;text-align:right;margin-top:2px;">' + statusText + ' &nbsp; ' + timeStr + '</span>';
      html += '</div>';
      var userAvatar = state.profile.avatar || '';
      html += '<img src="' + userAvatar + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;">';
      html += '</div>';
    } else {
      // 6. 梦角消息气泡
      var banStatusCheck = getDreamBanStatus(isGroup ? m.senderId : state.currentChatId);
      var displayAvatar = '';
      var senderName = '';

      if (isGroup) {
        if (m.senderId) {
          var member = state.dreams.find(function(item) { return item.id === m.senderId; });
          if (member) {
            senderName = member.name;
            displayAvatar = member.avatar || '';
          }
        }
        if (!senderName) senderName = '未知成员';
        if (!displayAvatar) displayAvatar = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2716%27 fill=%27%23eee%27/%3E%3Ctext x=%2716%27 y=%2720%27 text-anchor=%27middle%27 fill=%27%23aaa%27 font-size=%2712%27%3E?%3C/text%3E%3C/svg%3E';
      } else {
        var d = state.dreams.find(function(item) { return item.id === state.currentChatId; });
        if (d) {
          senderName = d.name;
          displayAvatar = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2716%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2716%27 y=%2720%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2712%27%3E💜%3C/text%3E%3C/svg%3E';
        }
      }

      html += '<div data-msg-index="' + i + '" style="display:flex;justify-content:flex-start;align-items:flex-end;gap:8px;margin-bottom:6px;">';
      html += '<img src="' + displayAvatar + '" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;">';
      html += '<div style="max-width:70%;">';
      
      if (isGroup && senderName) {
        html += '<span style="font-size:10px;color:#86868b;display:block;margin-bottom:2px;">' + senderName + '</span>';
      }
      var _banCheck = getDreamBanStatus(isGroup ? m.senderId : state.currentChatId, m.time);

      // 👇 安全生成情绪标签（不影响原本的 if 逻辑）
      var emotionHtml = '';
      if (state.settings.emotionEnabled !== false) {
        if (!m.emotion) {
          m.emotion = DREAM_EMOTIONS[Math.floor(Math.random() * DREAM_EMOTIONS.length)];
        }
        emotionHtml = '<div class="chat-emotion-bar"><span class="emotion-tag">情绪</span><span class="emotion-text">' + m.emotion + '</span></div>';
      }

      if (_banCheck === 'banned') {
        html += '<div class="chat-bubble bubble-dream ' + styleClass + '" style="' + dreamBg + textColor + 'opacity:0.6;font-style:italic;">此账号已被封禁</div>';
      } else if (_banCheck === 'apologizing') {
        if (!m._apologyText) {
          m._apologyText = pickApology();
        }
        html += '<div class="chat-bubble bubble-dream ' + styleClass + '" style="' + dreamBg + textColor + '">';
        if (imgSrc) {
          html += '<div style="font-size:11px;opacity:0.7;padding:4px 8px;margin-bottom:4px;background:rgba(0,0,0,0.06);border-left:2px solid #999;border-radius:4px;">[表情]</div>';
        } else {
          html += '<div style="font-size:11px;opacity:0.7;padding:4px 8px;margin-bottom:4px;background:rgba(0,0,0,0.06);border-left:2px solid #999;border-radius:4px;">' + m.text + '</div>';
        }
        html += m._apologyText;
        html += '</div>';
      } else if (imgSrc) {
        // 图片/表情气泡：加上情绪标签
        html += '<div class="chat-bubble bubble-dream ' + styleClass + '" style="' + dreamBg + textColor + 'padding:4px;"><img src="' + imgSrc + '" style="max-width:120px;max-height:180px;border-radius:6px;object-fit:contain;display:block;">' + emotionHtml + '</div>';
      } else {
        // 纯文字气泡：加上情绪标签
        // 纯文字气泡：加上情绪标签
var textClass = 'chat-text-content';
if (m.cut === 'end') {
    textClass += ' text-fade-right';
} else if (m.cut === 'start') {
    textClass += ' text-fade-left';
}
html += '<div class="chat-bubble bubble-dream ' + styleClass + '" style="' + dreamBg + textColor + '"><div class="' + textClass + '">' + m.text + '</div>' + emotionHtml + '</div>';
      }
      html += '<span style="font-size:9px;color:#b0b0b0;display:block;margin-top:2px;">' + timeStr + '</span>';
      html += '</div>';
      html += '</div>';
    }
  }
  container.innerHTML = html;
    // 统一注入引用内容
  chatMessages.forEach(function(m, i) {
    if (m && m.quote) {
      var el = container.querySelector('[data-msg-index="' + i + '"] [class*="bubble"]');
      if (el && !el.querySelector('.quote-block')) {
        var q = document.createElement('div');
        q.className = 'quote-block';
        q.style.cssText = 'font-size:11px;opacity:0.75;padding:4px 8px;margin-bottom:4px;background:rgba(0,0,0,0.06);border-left:2px solid #999;border-radius:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;';
        q.textContent = m.quote.senderName + '：' + m.quote.text;
        el.insertBefore(q, el.firstChild);
      }
    }
  });
    // 多选模式：加勾选框 + 拦截点击
  if (isMultiSelectMode) {
    var items = container.querySelectorAll('[data-msg-index]');
    items.forEach(function(el) {
      var idx = parseInt(el.dataset.msgIndex);
      var isSelected = selectedIndices.indexOf(idx) > -1;
      // 视觉反馈
      el.style.transition = 'opacity 0.15s';
      el.style.opacity = isSelected ? '0.55' : '1';
      // 加勾选框
      var box = document.createElement('div');
      box.style.cssText = 'position:absolute;left:6px;top:50%;transform:translateY(-50%);width:20px;height:20px;border-radius:50%;border:2px solid var(--blue);background:' + (isSelected ? 'var(--blue)' : '#fff') + ';color:#fff;font-size:12px;line-height:20px;text-align:center;pointer-events:none;z-index:5;';
      box.textContent = isSelected ? '✓' : '';
      el.style.position = 'relative';
      el.appendChild(box);
      // 拦截点击（用 onclick 捕获）
      el.onclick = (function(i) {
        return function(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          toggleSelectMessage(i);
        };
      })(idx);
    });
  } else {
    // 退出多选时，移除 onclick 拦截
    var items2 = container.querySelectorAll('[data-msg-index]');
    items2.forEach(function(el) { el.onclick = null; el.style.opacity = '1'; });
  }
  container.scrollTop = container.scrollHeight;
  attachLongPress();

   // 只有真的在聊天界面，才把当前聊天标记为"已读"
  var _mp = document.getElementById('pagePrivateChat');
  if (state.currentChatId && _mp && _mp.classList.contains('active')) {
    if (!state.lastReadAt) state.lastReadAt = {};
    state.lastReadAt[state.currentChatId] = Date.now();
    saveState();
  }
}
// ===== 渲染聊天列表 =====
function renderChatList() {
  var container = document.getElementById('chatListContainer');
  if (!container) return;

  var html = '';

  // 1. 先渲染群聊列表
  if (state.groups && state.groups.length > 0) {
    state.groups.forEach(function(g) {
      var msgs = state.chatSessions[g.id] || [];
      var lastMsg = msgs[msgs.length - 1];
      if (lastMsg === undefined || lastMsg === null) lastMsg = null;
      var preview = '暂无消息';
      if (lastMsg) {
        if (lastMsg.stickerData || lastMsg.stickerIdx !== undefined) {
          preview = '[表情]';
        } else if (lastMsg.type === 'redpacket') {
          preview = '[红包]';
        } else if (lastMsg.type === 'gift') {
          preview = '[礼物]';
        } else if (lastMsg.from === 'system') {
          preview = lastMsg.text;
        } else if (lastMsg.from === 'user') {
          preview = (state.profile.name || '我') + '：' + (lastMsg.text || '');
        } else if (lastMsg.from === 'dream') {
          var senderName = '未知成员';
          if (lastMsg.senderId) {
            var mem = state.dreams.find(function(d){ return d.id === lastMsg.senderId; });
            if (mem) senderName = mem.name;
          } else if (lastMsg.senderName) {
            senderName = lastMsg.senderName;
          }
          preview = senderName + '：' + (lastMsg.text || '');
        } else {
          preview = lastMsg.text || '';
        }
      }
      var time = '';
      if (lastMsg) {
        var d = new Date(lastMsg.time);
        var h = d.getHours(), m = d.getMinutes();
        time = (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
      }
            var unreadG = 0;
      if (!state.mutedChats || state.mutedChats.indexOf(g.id) === -1) {
        var lastReadG = (state.lastReadAt && state.lastReadAt[g.id]) || 0;
        (state.chatSessions[g.id] || []).forEach(function(x) {
          if (x.from === 'dream' && x.time > lastReadG) unreadG++;
        });
      }
      var badgeG = unreadG > 0 ? '<span style="display:inline-block;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#ff3b30;color:#fff;font-size:10px;font-weight:600;line-height:16px;text-align:center;margin-left:6px;vertical-align:middle;box-sizing:border-box;">' + (unreadG > 99 ? '99+' : unreadG) + '</span>' : '';
      html += `
        <div class="chat-list-item" onclick="openChat('${g.id}')">
          <img class="chat-list-avatar" src="${g.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2750%27 height=%2750%27 viewBox=%270 0 50 50%27%3E%3Ccircle cx=%2725%27 cy=%2725%27 r=%2725%27 fill=%27%23dff0ff%27/%3E%3Ctext x=%2725%27 y=%2730%27 text-anchor=%27middle%27 fill=%27%23007aff%27 font-size=%2720%27%3E👥%3C/text%3E%3C/svg%3E'}">
          <div class="chat-list-info">
            <div class="chat-list-top">
              <span class="chat-list-name">${g.name} (${g.memberIds.length})${badgeG}</span>
              <span class="chat-list-time">${time}</span>
            </div>
            <div class="chat-list-preview">${preview}</div>
          </div>
        </div>
      `;
    });
  }

  // 2. 再渲染私聊列表
  if (state.dreams && state.dreams.length > 0) {
    state.dreams.forEach(function(d) {
      var msgs = state.chatSessions[d.id] || [];
      var lastMsg = msgs[msgs.length - 1];
      var preview = lastMsg ? (lastMsg.stickerData || lastMsg.stickerIdx !== undefined ? '[表情]' : lastMsg.text) : '暂无消息';
      var time = '';
      if (lastMsg) {
        var date = new Date(lastMsg.time);
        var h = date.getHours(), m = date.getMinutes();
        time = (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
      }
      var avatar = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2750%27 height=%2750%27 viewBox=%270 0 50 50%27%3E%3Ccircle cx=%2725%27 cy=%2725%27 r=%2725%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2725%27 y=%2730%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2720%27%3E💜%3C/text%3E%3C/svg%3E';
      html += `
        <div class="chat-list-item" onclick="openChat('${d.id}')">
          <img class="chat-list-avatar" src="${avatar}">
          <div class="chat-list-info">
            <div class="chat-list-top">
             <span class="chat-list-name">${d.name}${d.currentStatus ? '<span style="font-size:11px;color:var(--gray);font-weight:400;margin-left:6px;">' + d.currentStatus + '</span>' : ''}${(() => {
               if (state.mutedChats && state.mutedChats.indexOf(d.id) > -1) return '';
               var lr = (state.lastReadAt && state.lastReadAt[d.id]) || 0;
               var cnt = 0;
               (state.chatSessions[d.id] || []).forEach(function(x) {
                 if (x.from === 'dream' && x.time > lr) cnt++;
               });
               if (cnt === 0) return '';
               return '<span style="display:inline-block;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#ff3b30;color:#fff;font-size:10px;font-weight:600;line-height:16px;text-align:center;margin-left:6px;vertical-align:middle;box-sizing:border-box;">' + (cnt > 99 ? '99+' : cnt) + '</span>';
             })()}</span>
              <span class="chat-list-time">${time}</span>
            </div>
            <div class="chat-list-preview">${preview}</div>
          </div>
        </div>
      `;
    });
  }

  if (html === '') {
    html = '<div class="empty-state">还没有聊天对象，快去添加梦角或建群吧！</div>';
  }
  container.innerHTML = html;
  try { updateAppIconBadges(); } catch(e) {}
}

// ===== 打开指定梦角的聊天窗口 =====
function openChat(id) {
    if (!state.lastReadAt) state.lastReadAt = {};
  state.lastReadAt[id] = Date.now();
  saveState();
  state.currentChatId = id;
  var isGroup = id && id.startsWith('group_');
  
  if (isGroup) {
    var g = state.groups.find(function(item) { return item.id === id; });
    if (g) {
      document.getElementById('chatHeaderName').textContent = g.name;
      checkExpiredMutes(g);
    } else {
      showToast('该群聊不存在');
      navigateTo('pageChatList');
      return;
    }
  } else {
    var d = state.dreams.find(function(item) { return item.id === id; });
    if (d) {
      state.dream = Object.assign({}, d);
      document.getElementById('chatHeaderName').textContent = d.name + (d.currentStatus ? ' · ' + d.currentStatus : '');
    } else {
      showToast('该梦角不存在');
      navigateTo('pageChatList');
      return;
    }
  }
  
  // 强制跳转到私聊页面
  navigateTo('pagePrivateChat');
  try { updateAppIconBadges(); } catch(e) {}
}

// ===== 群聊占位（第三阶段实现） =====
// ===== 打开建群页面 =====
function createGroupChat() {
  if (!state.dreams || state.dreams.length === 0) {
    showToast('还没有梦角，无法建群哦');
    return;
  }
  var list = document.getElementById('groupMemberList');
  list.innerHTML = state.dreams.map(function(d) {
    var avatar = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%2720%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2720%27 y=%2725%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2716%27%3E💜%3C/text%3E%3C/svg%3E';
    return `
      <label style="display:flex;align-items:center;background:var(--card);padding:12px 16px;border-radius:12px;border:1px solid var(--border);cursor:pointer;">
        <input type="checkbox" value="${d.id}" style="width:18px;height:18px;margin-right:12px;accent-color:var(--blue);">
        <img src="${avatar}" style="width:36px;height:36px;border-radius:50%;margin-right:10px;object-fit:cover;">
        <span style="font-size:15px;color:var(--text);">${d.name}</span>
      </label>
    `;
  }).join('');
  
  document.getElementById('groupNameInput').value = '我们的秘密基地';
  navigateTo('pageCreateGroup');
}

// ===== 保存群聊 =====
function saveGroup() {
  var name = document.getElementById('groupNameInput').value.trim() || '未命名群聊';
  var checkboxes = document.querySelectorAll('#groupMemberList input[type="checkbox"]:checked');
  var memberIds = [];
  checkboxes.forEach(function(cb) { memberIds.push(cb.value); });

  if (memberIds.length === 0) {
    showToast('至少要选一个群成员哦！');
    return;
  }

  var groupId = 'group_' + Date.now();
  state.groups.push({
    id: groupId,
    name: name,
    memberIds: memberIds,
    avatar: '',
    ownerId: 'user', // 新增：默认群主是用户自己
    mutedIds: []     // 新增：被禁言的成员名单
  });
  saveState();
    // 拉群系统消息
  var memberNames = memberIds.map(function(id) {
    var m = state.dreams.find(function(d) { return d.id === id; });
    return m ? m.name : '未知';
  });
  var myName = state.profile.name || '我';
  if (!state.chatSessions[groupId]) state.chatSessions[groupId] = [];
  state.chatSessions[groupId].push({ from: 'system', text: '「' + myName + '」邀请「' + memberNames.join('」「') + '」进入了群聊', time: Date.now() });
  showToast('群聊创建成功！');
  navigateTo('pageChatList');
}
// ===== 判断打开哪个设置 =====
function openChatSettings() {
  if (state.currentChatId && state.currentChatId.startsWith('group_')) {
    renderGroupSettings();
    navigateTo('pageGroupSettings');
  } else {
    initMuteToggle();
    initChatBeautifyPages();
    initReadNoReplyToggle();
    navigateTo('pageChatSettings');
  }
}

// ===== 渲染群设置页面 =====
// ===== 渲染群设置页面 =====
function renderGroupSettings() {
  var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
  if (!g) return;
  
  // 每次打开设置，先检查有没有禁言到期
  checkExpiredMutes(g);

  // 初始化：如果没有群头像，留空
  if (!g.avatar) g.avatar = '';
  
  var ownerName = '我';
  if (g.ownerId && g.ownerId !== 'user') {
    var owner = state.dreams.find(function(d) { return d.id === g.ownerId; });
    if (owner) ownerName = owner.name;
  }
  var isUserOwner = (g.ownerId === 'user');

  // 渲染群头像和群名区域
  var groupAvatarHtml = `
    <div class="avatar-edit" style="margin-bottom:16px;">
      <img class="avatar-preview" id="groupAvatarPreview" src="${g.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2780%27 height=%2780%27 viewBox=%270 0 80 80%27%3E%3Ccircle cx=%2740%27 cy=%2740%27 r=%2740%27 fill=%27%23dff0ff%27/%3E%3Ctext x=%2740%27 y=%2744%27 text-anchor=%27middle%27 fill=%27%23007aff%27 font-size=%2728%27%3E👥%3C/text%3E%3C/svg%3E'}" onclick="document.getElementById('groupAvatarInput').click()">
      <input type="file" id="groupAvatarInput" accept="image/*" style="display:none" onchange="handleGroupAvatar(event)">
      <span style="font-size:12px;color:var(--gray);cursor:pointer" onclick="document.getElementById('groupAvatarInput').click()">点击更换群头像</span>
    </div>
    <div class="form-group">
      <label>群聊名称</label>
      <input type="text" id="groupSettingsName" value="${g.name}" placeholder="给群聊起个名字">
    </div>
    <div style="font-size:13px; font-weight:500; color:var(--gray); margin-bottom:4px;">当前群主</div>
    <div style="background:var(--card); padding:12px 14px; border-radius:12px; border:1px solid var(--border); font-size:15px; color:var(--text); margin-bottom:16px;">
      ${ownerName} ${isUserOwner ? '（你自己）' : ''}
    </div>
  `;
  document.getElementById('groupOwnerArea').innerHTML = groupAvatarHtml;

  // 渲染添加成员区域（只对群主可见）
  var addMemberHtml = '';
  if (isUserOwner) {
    // 找出不在群里的梦角
    var availableDreams = state.dreams.filter(function(d) {
      return !g.memberIds.includes(d.id);
    });
    if (availableDreams.length > 0) {
      addMemberHtml = `
        <label style="font-size:14px;font-weight:600;color:var(--text);display:block;margin-top:16px;margin-bottom:8px;">添加新成员</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
      `;
      availableDreams.forEach(function(d) {
        addMemberHtml += `
          <div onclick="addGroupMember('${d.id}')" style="display:flex;align-items:center;background:var(--card);padding:6px 12px;border-radius:20px;border:1px dashed var(--border);cursor:pointer;font-size:13px;">
            <img src="${d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%2712%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2712%27 y=%2716%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2710%27%3E💜%3C/text%3E%3C/svg%3E'}" style="width:24px;height:24px;border-radius:50%;margin-right:6px;object-fit:cover;">
            ${d.name}
          </div>
        `;
      });
      addMemberHtml += `</div>`;
    }
  }

  // 渲染成员列表及操作按钮（只有群主才能操作禁言/移出/转让）
  var list = document.getElementById('groupMemberManageList');
  var membersHtml = '';
  g.memberIds.forEach(function(id) {
    var m = state.dreams.find(function(d) { return d.id === id; });
    if (!m) return;
    
    var isMuted = g.muteEndsAt && g.muteEndsAt[id] !== undefined;
    var isOwner = (g.ownerId === id);
    
    // 只有用户是群主时，才能操作别人
    var actionBtns = '';
    if (isUserOwner && !isOwner) {
      actionBtns = `
        <span style="font-size:12px;padding:4px 8px;border-radius:8px;cursor:pointer;background:#dff0ff;color:#007aff;margin-left:6px;" onclick="transferGroupOwner('${id}')">转让</span>
        <span style="font-size:12px;padding:4px 8px;border-radius:8px;cursor:pointer;background:${isMuted ? '#ffe0e0' : '#f0f0f5'};color:${isMuted ? 'var(--red)' : 'var(--gray)'};margin-left:6px;" onclick="selectMuteTime('${id}')">${isMuted ? '解除' : '禁言'}</span>
        <span style="font-size:12px;padding:4px 8px;border-radius:8px;cursor:pointer;background:#ffe0e0;color:var(--red);margin-left:6px;" onclick="removeGroupMember('${id}')">移出</span>
      `;
    } else if (isMuted) {
      actionBtns = `<span style="font-size:12px;color:var(--red);margin-left:6px;">已禁言</span>`;
    }
    
    membersHtml += `
      <div style="display:flex;align-items:center;background:var(--card);padding:10px 12px;border-radius:12px;border:1px solid var(--border);margin-bottom:8px;">
        <img src="${m.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2736%27 height=%2736%27 viewBox=%270 0 36 36%27%3E%3Ccircle cx=%2718%27 cy=%2718%27 r=%2718%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2718%27 y=%2723%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2714%27%3E💜%3C/text%3E%3C/svg%3E'}" style="width:36px;height:36px;border-radius:50%;margin-right:10px;object-fit:cover;">
        <span style="flex:1;font-size:15px;color:var(--text);">${m.name} ${isOwner ? '<span style="font-size:11px;color:#ff9500;">(群主)</span>' : ''}</span>
        ${actionBtns}
      </div>
    `;
  });
  
  // 将添加成员区域和成员列表拼在一起，放在群主区域下方
  document.getElementById('groupOwnerArea').innerHTML += addMemberHtml;
  list.innerHTML = membersHtml;
    // 自动回显群聊的美化设置
  initChatBeautifyPages();
  initMuteToggle();
  initReadNoReplyToggle();
}

// ===== 用户主动转让群主 =====
function transferGroupOwner(memberId) {
  var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
  if (!g) return;
  if (g.ownerId !== 'user') { showToast('只有群主才能转让哦'); return; }
  
  var member = state.dreams.find(function(d) { return d.id === memberId; });
  if (!member) return;
  if (!confirm('确定要把群主转让给「' + member.name + '」吗？')) return;

  var oldOwnerName = '你';
  g.ownerId = memberId;
  
  // 推送系统消息
  var sysMsg = { from: 'system', text: '「' + oldOwnerName + '」已将群主转让给「' + member.name + '」', time: Date.now() };
  if (!state.chatSessions[g.id]) state.chatSessions[g.id] = [];
  state.chatSessions[g.id].push(sysMsg);
  
  saveState();
  renderGroupSettings();
  renderChatMessages(); // 如果此时在群里，刷新聊天界面
  showToast('群主已转让');
}

// ===== 修改群名 =====
function updateGroupName() {
  var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
  if (!g) return;
  g.name = document.getElementById('groupSettingsName').value.trim() || '未命名';
  saveState();
  showToast('群名已修改');
}

// ===== 禁言/解除禁言 =====
function toggleMuteMember(id) {
  var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
  if (!g) return;
  if (!g.mutedIds) g.mutedIds = [];
  
  var idx = g.mutedIds.indexOf(id);
  var member = state.dreams.find(function(d) { return d.id === id; });
  var memberName = member ? member.name : '未知';

  if (idx > -1) {
    g.mutedIds.splice(idx, 1);
    showToast('已解除 ' + memberName + ' 的禁言');
  } else {
    g.mutedIds.push(id);
    // 【系统消息】：在群里显示禁言提示
    var sysMsg = { from: 'system', text: '「' + memberName + '」已被群主禁言', time: Date.now() };
    // 把系统消息推送到聊天记录里
    if (!state.chatSessions[g.id]) state.chatSessions[g.id] = [];
    state.chatSessions[g.id].push(sysMsg);
    showToast('已禁言 ' + memberName);
  }
  saveState();
  renderGroupSettings();
}

// ===== 移出群成员 =====
function removeGroupMember(id) {
  var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
  if (!g) return;
  if (!confirm('确定要将该成员移出群聊吗？')) return;
  
  g.memberIds = g.memberIds.filter(function(mid) { return mid !== id; });
  if (g.mutedIds) g.mutedIds = g.mutedIds.filter(function(mid) { return mid !== id; });
  if (g.ownerId === id) g.ownerId = 'user'; // 如果群主被移出，群主自动回到用户身上
  saveState();
  renderGroupSettings();
  showToast('成员已移出');
}

// ===== 解散群聊 =====
function dissolveGroup() {
  if (!confirm('确定要解散该群聊吗？聊天记录也会被清除！')) return;
  state.groups = state.groups.filter(function(item) { return item.id !== state.currentChatId; });
  delete state.chatSessions[state.currentChatId];
  state.currentChatId = null;
  saveState();
  showToast('群聊已解散');
  navigateTo('pageChatList');
}
// ===== 检查禁言是否过期（自动解除） =====
function checkExpiredMutes(group) {
  if (!group || !group.muteEndsAt) return false;
  var now = Date.now();
  var hasChanges = false;
  
  Object.keys(group.muteEndsAt).forEach(function(memberId) {
    if (now >= group.muteEndsAt[memberId]) {
      // 到期了，解禁
      delete group.muteEndsAt[memberId];
      var member = state.dreams.find(function(d) { return d.id === memberId; });
      var memberName = member ? member.name : '未知成员';
      
      // 写入系统消息
      if (!state.chatSessions[group.id]) state.chatSessions[group.id] = [];
      state.chatSessions[group.id].push({
        from: 'system',
        text: '「' + memberName + '」的禁言时间已结束，已自动解除禁言',
        time: Date.now()
      });
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    saveState();
  }
  return hasChanges;
}
// ===== 保存群设置 =====
function saveGroupSettings() {
  var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
  if (!g) return;
  g.name = document.getElementById('groupSettingsName').value.trim() || '未命名';
  
  // 顺便保存气泡颜色、字体、CSS等设置
  saveChatSettings(); 
  
  saveState();
  showToast('群设置已保存');
  // 刷新聊天界面顶部的群名
  document.getElementById('chatHeaderName').textContent = g.name;
  renderChatMessages();
}

// ===== 群头像上传（带压缩） =====
function handleGroupAvatar(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX_SIZE = 200;
      var width = img.width, height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
      } else {
        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
      }
      canvas.width = width; canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      var compressedDataUrl = canvas.toDataURL('image/png');
      
      // 更新预览和本地数据
      document.getElementById('groupAvatarPreview').src = compressedDataUrl;
      var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
      if (g) {
        g.avatar = compressedDataUrl;
        saveState();
        renderChatList(); // 刷新聊天列表里的群头像
        showToast('群头像已更新');
      }
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ===== 添加群成员 =====
function addGroupMember(memberId) {
  var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
  if (!g) return;
  if (g.memberIds.includes(memberId)) return;
  
  g.memberIds.push(memberId);
  saveState();
  renderGroupSettings(); // 重新渲染页面
  showToast('成员已添加');
  
  // 系统消息
  var member = state.dreams.find(function(d) { return d.id === memberId; });
  if (member) {
    if (!state.chatSessions[g.id]) state.chatSessions[g.id] = [];
    state.chatSessions[g.id].push({ from: 'system', text: '「' + member.name + '」加入了群聊', time: Date.now() });
    saveState();
  }
}

// ===== 弹出禁言时间选择 =====
function selectMuteTime(memberId) {
  var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
  if (!g) return;
  
  if (g.muteEndsAt && g.muteEndsAt[String(memberId)] !== undefined) {
    delete g.muteEndsAt[String(memberId)];
    var member = state.dreams.find(function(d) { return d.id === memberId; });
    var memberName = member ? member.name : '未知';
    if (!state.chatSessions[g.id]) state.chatSessions[g.id] = [];
    state.chatSessions[g.id].push({ from: 'system', text: '「' + memberName + '」已解除禁言', time: Date.now() });
    saveState();
    renderGroupSettings();
    renderChatMessages();
    showToast('已解除禁言');
    return;
  }
  
  var times = [
    { label: '5分钟', value: 5 * 60 * 1000 },
    { label: '10分钟', value: 10 * 60 * 1000 },
    { label: '15分钟', value: 15 * 60 * 1000 },
    { label: '30分钟', value: 30 * 60 * 1000 }
  ];
  
  var msg = '请选择禁言时长：\n1. 5分钟\n2. 10分钟\n3. 15分钟\n4. 30分钟\n（输入对应数字）';
  var choice = prompt(msg, '1');
  if (choice === null) return;
  
  var idx = parseInt(choice) - 1;
  if (idx < 0 || idx >= times.length) { showToast('选择无效'); return; }
  
  var duration = times[idx].value;
  if (!g.muteEndsAt) g.muteEndsAt = {};
  g.muteEndsAt[String(memberId)] = Date.now() + duration; // 强制转成字符串

  // 【核心】取消之前所有的 AI 回复闹钟，防止他在被禁言后还能发出声音
  if (window.replyTimeout) {
    clearTimeout(window.replyTimeout);
    window.replyTimeout = null;
  }
  
  var member = state.dreams.find(function(d) { return d.id === memberId; });
  var memberName = member ? member.name : '未知';
  if (!state.chatSessions[g.id]) state.chatSessions[g.id] = [];
  state.chatSessions[g.id].push({ from: 'system', text: '「' + memberName + '」已被群主禁言 ' + times[idx].label, time: Date.now() });
  
  saveState();
  renderGroupSettings();
  renderChatMessages();
  showToast('已禁言 ' + times[idx].label);
}
// ===== 面板控制逻辑 =====
function toggleActionMenu() {
  var menu = document.getElementById('actionMenuPanel');
  var sticker = document.getElementById('stickerPanel');
  var poke = document.getElementById('pokePanel');
  
  if (menu.style.display === 'none' || menu.style.display === '') {
    menu.style.display = 'block';
    sticker.style.display = 'none';
    poke.style.display = 'none';
  } else {
    menu.style.display = 'none';
  }
}

function openStickerPanel() {
  document.getElementById('actionMenuPanel').style.display = 'none';
  document.getElementById('pokePanel').style.display = 'none';
  document.getElementById('stickerPanel').style.display = 'block';
  renderStickers();
}

function openPokePanel() {
  document.getElementById('actionMenuPanel').style.display = 'none';
  document.getElementById('stickerPanel').style.display = 'none';
  document.getElementById('pokePanel').style.display = 'block';
  renderPokes();
}

// ===== 拍一拍数据与逻辑 =====
// 初始化拍一拍词条（如果还没的话）
if (!state.pokes) {
  state.pokes = ["拍了拍对方", "戳了戳脸颊", "摸了摸头"];
}

function renderPokes() {
  var container = document.getElementById('pokeListContainer');
  if (!container) return;
  
  container.innerHTML = state.pokes.map(function(text, index) {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);padding:10px 12px;border-radius:10px;margin-bottom:6px;">
        <span style="font-size:14px;color:var(--text);cursor:pointer;flex:1;" onclick="sendPoke('${text}')">${text}</span>
        <span style="font-size:16px;color:var(--red);cursor:pointer;padding:0 6px;" onclick="deletePoke(${index})">×</span>
      </div>
    `;
  }).join('');
}

function addPokeText() {
  var input = prompt('输入拍一拍内容（支持批量添加，用换行或逗号隔开）：');
  if (!input || !input.trim()) return;
  
  // 自动识别换行、中英文逗号、分号进行拆分
  var lines = input.split(/[\n,，;；]/).map(function(s){ return s.trim(); }).filter(function(s){ return s; });
  
  if (lines.length === 0) return;
  
  var added = 0;
  lines.forEach(function(line) {
    // 过滤重复词条
    if (state.pokes.indexOf(line) === -1) {
      state.pokes.push(line);
      added++;
    }
  });
  
  if (added > 0) {
    saveState();
    renderPokes();
    showToast('已添加 ' + added + ' 条拍一拍');
  } else {
    showToast('词条已存在');
  }
}

function deletePoke(index) {
  state.pokes.splice(index, 1);
  saveState();
  renderPokes();
  showToast('已删除');
}

// ===== 发送拍一拍（用户） =====
function sendPoke(text) {
  var senderName = state.profile.name || '我';
  
  chatMessages.push({
    from: 'user',
    type: 'poke',
    text: text,  // 直接原样发送用户输入的内容
    senderName: senderName,
    time: Date.now()
  });
  
  document.getElementById('actionMenuPanel').style.display = 'none';
  document.getElementById('pokePanel').style.display = 'none';
  renderChatMessages();
  saveChatMessages();
  
    scheduleAiReply();
}

// ===== 发送图片（用户） =====
function sendImageMessage(e) {
  var file = e.target.files[0];
  if (!file) return;
  
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX_WIDTH = 600;
      var width = img.width;
      var height = img.height;
      if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      var compressedDataUrl = canvas.toDataURL('image/png');
      
      // 新增：status: 'unread'
      chatMessages.push({ from: 'user', type: 'image', imageData: compressedDataUrl, time: Date.now(), status: 'unread' });
      document.getElementById('actionMenuPanel').style.display = 'none';
      renderChatMessages();
      saveChatMessages();
      
      scheduleAiReply();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

// ===== 正在输入 + 延迟回复调度器（终极唯一版） =====
function scheduleAiReply() {
  if (window.typingTimeout) clearTimeout(window.typingTimeout);
  if (window.replyTimeout) clearTimeout(window.replyTimeout);
  if (window.readTimeout) clearTimeout(window.readTimeout);

  // 提前选好回复的角色（群聊）
  window.nextReplySender = null;
  if (state.currentChatId && state.currentChatId.startsWith('group_')) {
    var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
    if (g && g.memberIds.length > 0) {
      var availableIds = g.memberIds.filter(function(id) {
        return !g.muteEndsAt || g.muteEndsAt[String(id)] === undefined;
      });
      if (availableIds.length > 0) {
        var randomId = availableIds[Math.floor(Math.random() * availableIds.length)];
        var member = state.dreams.find(function(item) { return item.id === randomId; });
        if (member) {
          window.nextReplySender = { id: member.id, name: member.name, avatar: member.avatar || '' };
        }
      }
    }
  }

  // 【已读】：1.5-4 秒后所有消息变已读
  window.readTimeout = setTimeout(function() {
    var hasUnread = false;
    for (var i = 0; i < chatMessages.length; i++) {
      if (chatMessages[i].from === 'user' && chatMessages[i].status === 'unread') {
        chatMessages[i].status = 'read';
        hasUnread = true;
      }
    }
    if (hasUnread) { saveChatMessages(); renderChatMessages(); }
  }, 1500 + Math.random() * 2500);

  // 【已读不回】：开启后，10% 概率不回
  var cs = getCurrentChatSettings();
  if (cs && cs.readNoReply) {
    if (Math.random() < 0.1) {
      // 只已读，不回
      return;
    }
  }

  // 正常回复：显示"正在输入" + 延迟发消息
  window.typingTimeout = setTimeout(function() { showTypingIndicator(); }, 1000 + Math.random() * 1000);

  var minS = (state.settings && state.settings.replyMinSec != null) ? state.settings.replyMinSec : 3;
  var maxS = (state.settings && state.settings.replyMaxSec != null) ? state.settings.replyMaxSec : 7;
  if (maxS < minS) maxS = minS;
  var delayMs = (minS + Math.random() * (maxS - minS)) * 1000;

  window.replyTimeout = setTimeout(function() { hideTypingIndicator(); dreamReply(); }, delayMs);
}

function showTypingIndicator() {
  var indicator = document.getElementById('typingIndicator');
  if (!indicator) return;
  var name = '';
  if (state.currentChatId && state.currentChatId.startsWith('group_')) {
    if (window.nextReplySender) name = window.nextReplySender.name;
    else { indicator.style.display = 'none'; return; }
  } else {
    var d = state.dreams.find(function(item) { return item.id === state.currentChatId; });
    if (d) name = d.name;
  }
  if (name) {
    indicator.innerHTML = '<span style="font-weight:600;color:#555;">' + name + '</span> 正在输入<span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>';
    indicator.style.display = 'flex';
  } else {
    indicator.style.display = 'none';
  }
}

function hideTypingIndicator() {
  var indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.style.display = 'none';
}

// ===== 长按消息菜单（事件委托版，修复红包/礼物卡片无法删除） =====
var pressTimer = null;
var pressTarget = null;
var pressStartX = 0;
var pressStartY = 0;
var pressTriggered = false;

// 长按触发后，拦截下一次 click（防止打开红包/礼物详情把菜单盖掉）
(function initClickSuppress() {
  if (window._clickSuppressBound) return;
  window._clickSuppressBound = true;
  window._suppressNextClick = false;
  document.addEventListener('click', function(e) {
    if (window._suppressNextClick) {
      e.preventDefault();
      e.stopPropagation();
      window._suppressNextClick = false;
    }
  }, true);
})();

function attachLongPress() {
  var container = document.getElementById('chatMessages');
  if (!container) return;
  if (container._msgPressBound) return;
  container._msgPressBound = true;

  function findMsgEl(el) {
    while (el && el !== container) {
      if (el.dataset && el.dataset.msgIndex !== undefined) return el;
      el = el.parentNode;
    }
    return null;
  }

  function onStart(e, el) {
    if (!el) return;
    var t = e.touches && e.touches[0] ? e.touches[0] : e;
    pressStartX = t.clientX;
    pressStartY = t.clientY;
    pressTarget = el;
    pressTriggered = false;

    clearTimeout(pressTimer);
    pressTimer = setTimeout(function() {
      if (!pressTarget) return;
      pressTriggered = true;
      var idx = parseInt(pressTarget.dataset.msgIndex);
      showMsgMenu(idx, pressTarget);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  }

  function onMove(e) {
    if (!pressTarget) return;
    var t = e.touches && e.touches[0] ? e.touches[0] : e;
    var dx = t.clientX - pressStartX;
    var dy = t.clientY - pressStartY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      clearTimeout(pressTimer);
      pressTarget = null;
    }
  }

  function onEnd(e) {
    clearTimeout(pressTimer);
    if (pressTriggered) {
      window._suppressNextClick = true;
      setTimeout(function() { window._suppressNextClick = false; }, 300);
    }
    pressTarget = null;
    pressTriggered = false;
  }

  container.addEventListener('touchstart', function(e) {
    var el = findMsgEl(e.target);
    if (el) onStart(e, el);
  }, { passive: true });

  container.addEventListener('touchmove', onMove, { passive: true });

  container.addEventListener('touchend', function(e) {
    if (!pressTarget && !pressTriggered) return;
    onEnd(e);
  });

  container.addEventListener('touchcancel', function(e) {
    clearTimeout(pressTimer);
    pressTarget = null;
    pressTriggered = false;
  });

  container.addEventListener('mousedown', function(e) {
    var el = findMsgEl(e.target);
    if (el) onStart(e, el);
  });

  container.addEventListener('mousemove', onMove);

  container.addEventListener('mouseup', function(e) {
    if (!pressTarget && !pressTriggered) return;
    onEnd(e);
  });
}

// 消息文本兜底（让红包/礼物卡片也能被引用、收藏）
function getMsgDisplayText(m) {
  if (!m) return '消息';
  if (m.type === 'redpacket') return '🧧 红包';
  if (m.type === 'gift') return '🎁 礼物';
  if (m.type === 'forward') return '📋 聊天记录';
  if (m.type === 'image') return '[图片]';
  if (m.text) return m.text;
  return '[表情]';
}

function showMsgMenu(index, el) {
  var m = chatMessages[index];
  if (!m) return;
  var menu = document.getElementById('msgMenu');
  var mask = document.getElementById('msgMenuMask');
    var items = [];
   if (m.from === 'user') items.push({ label: '撤回', action: 'recall' });
  items.push({ label: '引用', action: 'quote' });
  items.push({ label: '多选', action: 'multi' });
  items.push({ label: '收藏', action: 'favorite' });
  items.push({ label: '删除', action: 'delete' });

  menu.innerHTML = items.map(function(item) {
    return '<button onclick="handleMsgAction(\'' + item.action + '\',' + index + ')">' + item.label + '</button>';
  }).join('');

  menu.style.visibility = 'hidden';
  menu.style.display = 'flex';
  var menuW = menu.offsetWidth;
  var menuH = menu.offsetHeight;

   var bubbleEl = el.querySelector('[class*="bubble"]');
  var rect = bubbleEl ? bubbleEl.getBoundingClientRect() : el.getBoundingClientRect();
  var isUser = m.from === 'user';
  var left;
  if (isUser) left = rect.right - menuW;
  else left = rect.left;
  left = Math.max(10, Math.min(left, window.innerWidth - menuW - 10));

  var top = rect.top - menuH - 8;
  if (top < 10) top = rect.bottom + 8;

  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  menu.style.visibility = 'visible';

  // 显示遮罩
  mask.style.display = 'block';
}

function hideMsgMenu() {
  var menu = document.getElementById('msgMenu');
  var mask = document.getElementById('msgMenuMask');
  if (menu) menu.style.display = 'none';
  if (mask) mask.style.display = 'none';
}

function handleMsgAction(action, index) {
  var m = chatMessages[index];
  if (!m) { hideMsgMenu(); return; }

  // 多选
  if (action === 'multi') {
    hideMsgMenu();
    enterMultiSelect(index);
    return;
  }

  // 引用
  if (action === 'quote') {
    var senderName = '';
    if (m.from === 'user') {
      senderName = state.profile.name || '我';
    } else if (m.senderId) {
      var mem = state.dreams.find(function(d) { return d.id === m.senderId; });
      if (mem) senderName = mem.name;
    } else if (m.senderName) {
      senderName = m.senderName;
    } else {
      var dm = state.dreams.find(function(d) { return d.id === state.currentChatId; });
      if (dm) senderName = dm.name;
    }
        var _dispTxt = getMsgDisplayText(m);
    window.quoteData = { text: _dispTxt, senderName: senderName, msgId: index };
    document.getElementById('quotePreview').style.display = 'block';
    document.getElementById('quoteText').textContent = senderName + '：' + _dispTxt;
    hideMsgMenu();
    document.getElementById('chatInput').focus();
    return;
  }

  // 收藏
  if (action === 'favorite') {
    if (!state.favorites) state.favorites = [];
    var who = '我';
    if (m.from === 'user') {
      who = state.profile.name || '我';
    } else if (m.senderId) {
      var mem2 = state.dreams.find(function(d) { return d.id === m.senderId; });
      who = mem2 ? mem2.name : '梦角';
    } else if (m.senderName) {
      who = m.senderName;
    } else if (state.currentChatId && !state.currentChatId.startsWith('group_')) {
      var dm2 = state.dreams.find(function(d) { return d.id === state.currentChatId; });
      who = dm2 ? dm2.name : '梦角';
    } else {
      who = '梦角';
    }
    var chatName = '';
    if (state.currentChatId && state.currentChatId.startsWith('group_')) {
      var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
      chatName = g ? ('群聊：' + g.name) : '';
    } else {
      var d2 = state.dreams.find(function(item) { return item.id === state.currentChatId; });
      chatName = d2 ? ('私聊：' + d2.name) : '';
    }
       state.favorites.push({
      id: 'fav_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      text: getMsgDisplayText(m),
      senderName: who,
      isUser: m.from === 'user',
      chatName: chatName,
      time: m.time,
      addedAt: Date.now(),
      favBy: state.profile.name || '我', // 👈 加上这行，记录是当前用户收藏的
      favById: 'user'
    });
    saveState();
    hideMsgMenu();
    showToast('已收藏');
    return;
  }

  // 撤回
  if (action === 'recall') {
    if (m.from !== 'user') { hideMsgMenu(); return; }
    var name = state.profile.name || '我';
    chatMessages[index] = { from: 'system', text: '「' + name + '」撤回了一条消息', time: Date.now() };
    saveChatMessages();
    renderChatMessages();
    hideMsgMenu();
    showToast('已撤回');
    return;
  }

  // 删除
  if (action === 'delete') {
    chatMessages.splice(index, 1);
    saveChatMessages();
    renderChatMessages();
    hideMsgMenu();
    showToast('已删除');
    return;
  }

  hideMsgMenu();
}
function clearQuote() {
  window.quoteData = null;
  document.getElementById('quotePreview').style.display = 'none';
  document.getElementById('quoteText').textContent = '';
}
// ===== 多选模式 =====
var isMultiSelectMode = false;
var selectedIndices = [];

function enterMultiSelect(startIndex) {
  isMultiSelectMode = true;
  selectedIndices = [];
  if (typeof startIndex === 'number') selectedIndices.push(startIndex);
  document.getElementById('multiSelectBar').style.display = 'flex';
  updateMultiSelectUI();
  renderChatMessages();
}

function exitMultiSelect() {
  isMultiSelectMode = false;
  selectedIndices = [];
  document.getElementById('multiSelectBar').style.display = 'none';
  renderChatMessages();
}

function toggleSelectMessage(index) {
  var pos = selectedIndices.indexOf(index);
  if (pos > -1) selectedIndices.splice(pos, 1);
  else selectedIndices.push(index);
  updateMultiSelectUI();
  renderChatMessages();
}

function updateMultiSelectUI() {
  document.getElementById('multiSelectCount').textContent = '已选 ' + selectedIndices.length + ' 条';
}

function batchDeleteMessages() {
  if (selectedIndices.length === 0) { showToast('请先选择消息'); return; }
  if (!confirm('确定删除选中的 ' + selectedIndices.length + ' 条消息？')) return;
  // 从大到小删，防止索引错乱
  var sorted = selectedIndices.slice().sort(function(a, b) { return b - a; });
  sorted.forEach(function(i) { chatMessages.splice(i, 1); });
  exitMultiSelect();
  saveChatMessages();
  renderChatMessages();
  showToast('已删除');
}
// ===== 转发功能 =====
function openForwardPanel() {
  if (selectedIndices.length === 0) { showToast('请先选择消息'); return; }
  var panel = document.getElementById('forwardPanel');
  var mask = document.getElementById('forwardMask');
  var list = document.getElementById('forwardTargetList');
  var html = '';

  // 所有梦角
  if (state.dreams && state.dreams.length > 0) {
    state.dreams.forEach(function(d) {
      var avatar = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2750%27 height=%2750%27 viewBox=%270 0 50 50%27%3E%3Ccircle cx=%2725%27 cy=%2725%27 r=%2725%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2725%27 y=%2730%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2720%27%3E💜%3C/text%3E%3C/svg%3E';
      html += '<div onclick="doForward(\'' + d.id + '\')" style="display:flex;align-items:center;padding:12px 16px;cursor:pointer;border-bottom:1px solid #f5f5f5;"><img src="' + avatar + '" style="width:44px;height:44px;border-radius:50%;object-fit:cover;margin-right:12px;"><span style="font-size:15px;color:#333;">' + d.name + '</span></div>';
    });
  }
  // 所有群聊
  if (state.groups && state.groups.length > 0) {
    state.groups.forEach(function(g) {
      var avatar = g.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2750%27 height=%2750%27 viewBox=%270 0 50 50%27%3E%3Ccircle cx=%2725%27 cy=%2725%27 r=%2725%27 fill=%27%23dff0ff%27/%3E%3Ctext x=%2725%27 y=%2730%27 text-anchor=%27middle%27 fill=%27%23007aff%27 font-size=%2720%27%3E👥%3C/text%3E%3C/svg%3E';
      html += '<div onclick="doForward(\'' + g.id + '\')" style="display:flex;align-items:center;padding:12px 16px;cursor:pointer;border-bottom:1px solid #f5f5f5;"><img src="' + avatar + '" style="width:44px;height:44px;border-radius:50%;object-fit:cover;margin-right:12px;"><span style="font-size:15px;color:#333;">' + g.name + '</span></div>';
    });
  }

  if (html === '') html = '<div style="padding:30px;text-align:center;color:#999;">没有可转发的目标</div>';
  list.innerHTML = html;
  panel.style.display = 'block';
  mask.style.display = 'block';
}

function closeForwardPanel() {
  document.getElementById('forwardPanel').style.display = 'none';
  document.getElementById('forwardMask').style.display = 'none';
}

function doForward(targetId) {
  if (selectedIndices.length === 0) { closeForwardPanel(); return; }

  // 收集选中的消息（按原顺序）
  var sorted = selectedIndices.slice().sort(function(a, b) { return a - b; });
   var fwdMessages = sorted.map(function(i) {
    var m = chatMessages[i];
    var who = '';
    if (m.from === 'user') {
      who = state.profile.name || '我';
    } else if (m.senderId) {
      var mem = state.dreams.find(function(d) { return d.id === m.senderId; });
      who = mem ? mem.name : '梦角';
    } else if (m.senderName) {
      who = m.senderName;
    } else if (state.currentChatId && !state.currentChatId.startsWith('group_')) {
      var dm = state.dreams.find(function(d) { return d.id === state.currentChatId; });
      who = dm ? dm.name : '梦角';
    } else {
      who = '梦角';
    }
    return { from: m.from, text: m.text || '[表情]', senderId: m.senderId, senderName: who, stickerData: m.stickerData || (m.stickerIdx !== undefined ? stickers[m.stickerIdx] : null) };
  });

  // 【核心修复】强制生成标题
  var chatTitle = '';
  if (state.currentChatId && state.currentChatId.startsWith('group_')) {
    var g = state.groups.find(function(x){ return x.id === state.currentChatId; });
    chatTitle = g ? g.name + ' 的聊天记录' : '群聊记录';
  } else if (state.currentChatId) {
    var d = state.dreams.find(function(x){ return x.id === state.currentChatId; });
    chatTitle = d ? '我和 ' + d.name + ' 的聊天记录' : '私聊记录';
  } else {
    chatTitle = '我的聊天记录';
  }

  var previewText = fwdMessages[0] ? fwdMessages[0].text : '';
  var forwardCard = {
    from: 'user',
    type: 'forward',
    title: '聊天记录',
    chatTitle: chatTitle, // 把算好的名字存进去
    messages: fwdMessages,
    preview: previewText,
    time: Date.now(),
    status: 'unread'
  };

  // 判断目标：私聊 or 群聊
  var isGroup = targetId.startsWith('group_');
  var targetName = isGroup
    ? (state.groups.find(function(g){ return g.id === targetId; }) || {}).name || '群聊'
    : (state.dreams.find(function(d){ return d.id === targetId; }) || {}).name || '梦角';

  // 保存当前聊天
  saveChatMessages();

  // 切到目标聊天，追加转发卡片
  state.currentChatId = targetId;
  var targetMsgs = state.chatSessions[targetId] || [];
  targetMsgs.push(forwardCard);
  state.chatSessions[targetId] = targetMsgs;
  saveState();

  exitMultiSelect();
  closeForwardPanel();
  showToast('已转发给「' + targetName + '」');

  // 切到目标聊天
  loadChatMessages();
  renderChat();
  navigateTo('pagePrivateChat');
}

// 点击转发卡片展开
function openForwardDetail(index) {
  var m = chatMessages[index];
  if (!m || m.type !== 'forward') return;
  window._currentForwardMessages = m.messages || [];
  navigateTo('pageForwardDetail');
  renderForwardDetailPage();
}

// 渲染独立聊天记录页面
function renderForwardDetailPage() {
  var container = document.getElementById('forwardDetailBody');
  if (!container) return;
  var msgs = window._currentForwardMessages || [];
  
  if (msgs.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">没有聊天记录</div>';
    return;
  }

  var html = '';
  msgs.forEach(function(msg) {
    var isUser = msg.from === 'user';
    var senderId = msg.senderId;
    var senderName = msg.senderName || (isUser ? (state.profile.name || '我') : '梦角');
    var avatar = '';
    
    if (isUser) {
      avatar = state.profile.avatar || '';
    } else if (senderId) {
      var d = state.dreams.find(function(x) { return x.id === senderId; });
      if (d) {
        senderName = d.name;
        avatar = d.avatar || '';
      }
    } else if (msg.senderAvatar) {
       avatar = msg.senderAvatar;
    }

    html += '<div style="display:flex;justify-content:' + (isUser ? 'flex-end' : 'flex-start') + ';align-items:flex-start;gap:8px;">';
    if (!isUser) html += '<img src="' + avatar + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">';
    
    html += '<div style="max-width:70%;display:flex;flex-direction:column;' + (isUser ? 'align-items:flex-end;' : 'align-items:flex-start;') + '">';
    if (!isUser) {
      html += '<span style="font-size:11px;color:#999;margin-bottom:2px;margin-left:4px;">' + senderName + '</span>';
    }
    
    if (msg.stickerData) {
      html += '<img src="' + msg.stickerData + '" style="max-width:120px;max-height:180px;border-radius:8px;object-fit:contain;background:#fff;padding:4px;box-shadow:0 2px 6px rgba(0,0,0,0.05);">';
    } else {
      html += '<div style="background:' + (isUser ? '#95ec69' : '#fff') + ';color:#1d1d1f;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5;word-break:break-word;box-shadow:0 2px 6px rgba(0,0,0,0.05);">' + (msg.text || '') + '</div>';
    }
    
    html += '</div>';
    
    if (isUser) html += '<img src="' + avatar + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">';
    html += '</div>';
  });
  
  container.innerHTML = html;
}
// ===== 回复速度 & 主动找我 =====
function initSpeedSettings() {
  if (!state.settings) state.settings = {};
  
  var minInput = document.getElementById('replyMinSec');
  var maxInput = document.getElementById('replyMaxSec');
  
  if (minInput) {
    minInput.value = state.settings.replyMinSec != null ? state.settings.replyMinSec : 3;
    minInput.onchange = function() {
      var v = Math.max(0, parseInt(this.value) || 0);
      state.settings.replyMinSec = v;
      this.value = v;
      saveState();
    };
  }
  if (maxInput) {
    maxInput.value = state.settings.replyMaxSec != null ? state.settings.replyMaxSec : 7;
    maxInput.onchange = function() {
      var v = Math.max(0, parseInt(this.value) || 0);
      state.settings.replyMaxSec = v;
      this.value = v;
      saveState();
    };
  }
  
  // ===== 主动找我（自由输入分钟版） =====
  var autoInput = document.getElementById('autoMessageMin');
  if (autoInput) {
    // 读取旧数据：如果以前存的是毫秒（比如300000），自动换算成分钟显示
    var delayMs = state.settings.autoMessageDelay || 0;
    var delayMin = delayMs > 0 ? Math.round(delayMs / 60000) : 0;
    autoInput.value = delayMin;
    
    autoInput.onchange = function() {
      var mins = parseInt(this.value) || 0;
      if (mins < 0) mins = 0;
      this.value = mins;
      
      // 存进系统时，乘 60000 换算成毫秒，保证后台定时器正常工作
      state.settings.autoMessageDelay = mins * 60000;
      saveState();
      showToast(mins > 0 ? '主动找我：' + mins + ' 分钟后' : '已关闭主动找我');
    };
  }
    // ===== 拼接字卡设置 =====
  var joinToggle = document.getElementById('cardJoinToggle');
  var joinMin = document.getElementById('cardJoinMin');
  var joinMax = document.getElementById('cardJoinMax');
  if (joinToggle) {
    if (!state.settings) state.settings = {};
    joinToggle.classList.toggle('on', !!state.settings.cardJoinEnabled);
    joinToggle.onclick = function() {
      state.settings.cardJoinEnabled = !state.settings.cardJoinEnabled;
      joinToggle.classList.toggle('on', state.settings.cardJoinEnabled);
      saveState();
      showToast(state.settings.cardJoinEnabled ? '已开启拼接字卡' : '已关闭拼接字卡');
    };
  }
  if (joinMin) {
    joinMin.value = state.settings.cardJoinMin != null ? state.settings.cardJoinMin : 1;
    joinMin.onchange = function() {
      var v = Math.max(1, Math.min(7, parseInt(this.value) || 1));
      state.settings.cardJoinMin = v;
      this.value = v;
      saveState();
    };
  }
  if (joinMax) {
    joinMax.value = state.settings.cardJoinMax != null ? state.settings.cardJoinMax : 3;
    joinMax.onchange = function() {
      var v = Math.max(1, Math.min(7, parseInt(this.value) || 3));
      state.settings.cardJoinMax = v;
      this.value = v;
      saveState();
    };
  }

  // 梦角主动引用开关
  var quoteToggle = document.getElementById('dreamQuoteToggle');
  if (quoteToggle) {
    if (!state.settings) state.settings = {};
    var quoteOn = state.settings.dreamQuoteEnabled !== false;
    quoteToggle.classList.toggle('on', quoteOn);
    quoteToggle.onclick = function() {
      state.settings.dreamQuoteEnabled = !(state.settings.dreamQuoteEnabled !== false);
      quoteToggle.classList.toggle('on', state.settings.dreamQuoteEnabled !== false);
      saveState();
      showToast(state.settings.dreamQuoteEnabled !== false ? '已开启梦角引用' : '已关闭梦角引用');
    };
  }
}

function initChatSetting() {
  if (!state.settings) state.settings = {};
  if (state.settings.emotionEnabled === undefined) state.settings.emotionEnabled = true;
  if (state.settings.cutEnabled === undefined) state.settings.cutEnabled = true;

  // 情绪标签开关
  var et = document.getElementById('emotionToggle');
  if (et) {
    et.classList.toggle('on', state.settings.emotionEnabled);
    et.onclick = function() {
      state.settings.emotionEnabled = !state.settings.emotionEnabled;
      et.classList.toggle('on', state.settings.emotionEnabled);
      saveState();
      showToast(state.settings.emotionEnabled ? '情绪标签已开启' : '情绪标签已关闭');
      if (state.currentChatId) renderChatMessages();
    };
  }

  // 自由断句开关
  var ct = document.getElementById('cutToggle');
  if (ct) {
    ct.classList.toggle('on', state.settings.cutEnabled);
    ct.onclick = function() {
      state.settings.cutEnabled = !state.settings.cutEnabled;
      ct.classList.toggle('on', state.settings.cutEnabled);
      saveState();
      showToast(state.settings.cutEnabled ? '自由断句已开启' : '自由断句已关闭');
    };
  }

  // 初始化原来的其他输入框
  initSpeedSettings();
}

// ===== 消息统计 =====
function openStats() {
  document.getElementById('actionMenuPanel').style.display = 'none';
  var content = document.getElementById('statsContent');
  if (!chatMessages || chatMessages.length === 0) {
    content.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">还没有消息</div>';
    document.getElementById('statsPanel').style.display = 'block';
    document.getElementById('statsMask').style.display = 'block';
    return;
  }

  var isGroup = state.currentChatId && state.currentChatId.startsWith('group_');
  var html = '';

  if (isGroup) {
    // 群聊：说话最多排行
    var speakerCount = {};
    chatMessages.forEach(function(m) {
      if (m.from !== 'dream' || !m.senderId) return;
      speakerCount[m.senderId] = (speakerCount[m.senderId] || 0) + 1;
    });
    var arr = Object.keys(speakerCount).map(function(id) {
      var mem = state.dreams.find(function(d) { return d.id === id; });
      return { name: mem ? mem.name : '未知', count: speakerCount[id] };
    }).sort(function(a, b) { return b.count - a.count; });

    html += '<div style="font-size:13px;color:#999;margin-bottom:10px;">群聊活跃榜</div>';
    if (arr.length === 0) {
      html += '<div style="text-align:center;color:#999;padding:20px;">暂无数据</div>';
    } else {
      var medals = ['🥇', '🥈', '🥉'];
      arr.slice(0, 3).forEach(function(item, i) {
        html += '<div style="display:flex;align-items:center;padding:10px 12px;background:#f8f8fa;border-radius:12px;margin-bottom:8px;">';
        html += '<span style="font-size:20px;margin-right:10px;">' + (medals[i] || '') + '</span>';
        html += '<span style="flex:1;font-size:14px;color:#333;">' + item.name + '</span>';
        html += '<span style="font-size:13px;color:#888;">' + item.count + ' 条</span>';
        html += '</div>';
      });
    }
  } else {
    // 私聊：用户和梦角的消息数 + 高频话排行
    var userCount = 0, dreamCount = 0;
    var textCount = {};
    chatMessages.forEach(function(m) {
      if (m.from === 'user') userCount++;
      else if (m.from === 'dream') dreamCount++;
      var t = m.text;
      if (t && typeof t === 'string' && t.trim() && t !== '[表情]') {
        textCount[t] = (textCount[t] || 0) + 1;
      }
    });

    var d = state.dreams.find(function(item) { return item.id === state.currentChatId; });
    var dreamName = d ? d.name : '梦角';

    html += '<div style="display:flex;gap:10px;margin-bottom:16px;">';
    html += '<div style="flex:1;text-align:center;padding:14px;background:#f8f8fa;border-radius:12px;">';
    html += '<div style="font-size:22px;font-weight:600;color:#333;">' + userCount + '</div>';
    html += '<div style="font-size:12px;color:#888;margin-top:4px;">我发的</div>';
    html += '</div>';
    html += '<div style="flex:1;text-align:center;padding:14px;background:#f8f8fa;border-radius:12px;">';
    html += '<div style="font-size:22px;font-weight:600;color:#333;">' + dreamCount + '</div>';
    html += '<div style="font-size:12px;color:#888;margin-top:4px;">' + dreamName + ' 发的</div>';
    html += '</div>';
    html += '</div>';

    var topArr = Object.keys(textCount).map(function(k) {
      return { text: k, count: textCount[k] };
    }).sort(function(a, b) { return b.count - a.count; }).slice(0, 5);

    if (topArr.length > 0) {
      html += '<div style="font-size:13px;color:#999;margin-bottom:10px;">说得最多的前 5 句</div>';
      topArr.forEach(function(item, i) {
        html += '<div style="display:flex;align-items:center;padding:8px 12px;background:#f8f8fa;border-radius:10px;margin-bottom:6px;">';
        html += '<span style="font-size:12px;color:#999;margin-right:10px;min-width:16px;">' + (i+1) + '</span>';
        html += '<span style="flex:1;font-size:13px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + item.text + '</span>';
        html += '<span style="font-size:12px;color:#888;margin-left:8px;">×' + item.count + '</span>';
        html += '</div>';
      });
    }
  }

  content.innerHTML = html;
  document.getElementById('statsPanel').style.display = 'block';
  document.getElementById('statsMask').style.display = 'block';
}

function closeStats() {
  document.getElementById('statsPanel').style.display = 'none';
  document.getElementById('statsMask').style.display = 'none';
}

// 点遮罩关闭
document.getElementById('statsMask').addEventListener('click', closeStats);
// ===== 用户主动拨号 =====
window.currentCallTargets = [];
window.currentCallType = '';
window.aiAnswerTimer = null;
window.dialTimeoutTimer = null;

// ===== 通话系统（完整版） =====

function getDreamName(id) {
  if (id === 'user') return state.profile.name || '我';
  var d = state.dreams.find(function(x) { return x.id === id; });
  return d ? d.name : '未知';
}

function addSystemMessage(chatId, text) {
  if (!chatId) return;
  if (!state.chatSessions[chatId]) state.chatSessions[chatId] = [];
  state.chatSessions[chatId].push({ from: 'system', text: text, time: Date.now() });
  saveState();
  if (state.currentChatId === chatId) {
    loadChatMessages();
    // 刷新横条 + 聊天
    try { renderChat(); } catch(e) { renderChatMessages(); }
  }
  renderChatList();
}

function isDreamBusy(dreamId) {
  if (!state.activeCalls) return false;
  for (var i = 0; i < state.activeCalls.length; i++) {
    if (state.activeCalls[i].participants.indexOf(dreamId) > -1) return true;
  }
  return false;
}

function openCallPanel() {
  document.getElementById('actionMenuPanel').style.display = 'none';
  var isGroup = state.currentChatId && state.currentChatId.startsWith('group_');
  if (isGroup) {
    var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
    if (!g || g.memberIds.length === 0) { showToast('群成员为空'); return; }
        var list = document.getElementById('callSelectList');
    // 【核心修复】：每次打开选择面板，先清空所有勾选
    list.innerHTML = '';
    list.innerHTML = g.memberIds.map(function(id) {
      var m = state.dreams.find(function(d) { return d.id === id; });
      if (!m) return '';
      var avatar = m.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2750%27 height=%2750%27 viewBox=%270 0 50 50%27%3E%3Ccircle cx=%2725%27 cy=%2725%27 r=%2725%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2725%27 y=%2730%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2720%27%3E💜%3C/text%3E%3C/svg%3E';
      return '<label style="display:flex;align-items:center;padding:10px 12px;background:#f8f8fa;border-radius:12px;margin-bottom:8px;cursor:pointer;"><input type="checkbox" value="' + m.id + '" style="width:18px;height:18px;margin-right:12px;accent-color:#007aff;"><img src="' + avatar + '" style="width:40px;height:40px;border-radius:50%;margin-right:10px;object-fit:cover;"><span style="font-size:15px;color:#333;">' + m.name + '</span></label>';
    }).join('');
    document.getElementById('callSelectPanel').style.display = 'block';
    document.getElementById('callSelectMask').style.display = 'block';
    return;
  }
  startUserDial([state.currentChatId], false);
}

function closeCallSelect() {
  document.getElementById('callSelectPanel').style.display = 'none';
  document.getElementById('callSelectMask').style.display = 'none';
}

function confirmCallSelect() {
  var checked = document.querySelectorAll('#callSelectList input[type="checkbox"]:checked');
  var ids = [];
  checked.forEach(function(cb) { ids.push(cb.value); });
  if (ids.length === 0) { showToast('请至少选一个'); return; }
  closeCallSelect();
  startUserDial(ids, true);
}

function startUserDial(targetIds, isGroup) {
  if (state.callState !== 'idle') { showToast('正在通话中'); return; }
  if (!targetIds || targetIds.length === 0) { showToast('未选择通话对象'); return; }

  // 检查忙线
  var busy = targetIds.filter(function(id) { return isDreamBusy(id); });
  if (busy.length > 0) {
    var names = busy.map(getDreamName).join('、');
    addSystemMessage(state.currentChatId, names + ' 正忙，请稍候再试');
    showToast(names + ' 正忙');
    return;
  }

  var session = {
    id: 'call_' + Date.now(),
    chatId: state.currentChatId,
    type: isGroup ? 'group' : 'private',
    initiator: 'user',
    participants: ['user'],   // 只有用户先在里面
    invited: targetIds.slice(), // 邀请的人
    startTime: null,
    status: 'dialing',
    userInCall: true
  };
  state.activeCalls.push(session);
  state.callSession = session;
  state.callState = 'dialing';
  renderCallUI();

  var connectedOnce = false;
  var pendingCount = targetIds.length;

  function checkAllDone() {
    // 所有人都处理完了，且一个都没接，就结束通话
    if (pendingCount === 0 && session.participants.length <= 1 && !session.startTime) {
      endCallSession('对方已拒绝');
    }
  }

  // 给每个人独立抽签
  targetIds.forEach(function(id) {
    var roll = Math.random();

    if (roll < 0.65) {
      // ===== 接听 =====
      var delay = 1000 + Math.random() * 2500;
      setTimeout(function() {
        if (state.callState === 'idle') return; // 👈 加上这一行，如果挂断了，直接终止！
        if (state.activeCalls.indexOf(session) === -1) return;
        if (session.invited.indexOf(id) === -1) return; // 已被处理过
        session.invited.splice(session.invited.indexOf(id), 1);
        session.participants.push(id);
        if (isGroup) {
          addSystemMessage(session.chatId, '「' + getDreamName(id) + '」加入了通话');
        }

        // 第一个人接了，正式开始计时
        if (!session.startTime) {
          session.startTime = Date.now();
          session.status = 'connected';
          state.callState = 'connected';
          startCallTimer();
          connectedOnce = true;
        }
        renderCallUI();
        pendingCount--;
        checkAllDone();
      }, delay);

    } else if (roll < 0.85) {
      // ===== 拒绝 =====
      var delay2 = 1000 + Math.random() * 2000;
      setTimeout(function() {
        if (state.activeCalls.indexOf(session) === -1) return;
        if (session.invited.indexOf(id) === -1) return;
        session.invited.splice(session.invited.indexOf(id), 1);
        addSystemMessage(session.chatId, '「' + getDreamName(id) + '」拒绝了通话');
        renderCallUI();
        pendingCount--;
        checkAllDone();
      }, delay2);

    } else {
      // ===== 超时 =====
      setTimeout(function() {
        if (state.activeCalls.indexOf(session) === -1) return;
        if (session.invited.indexOf(id) === -1) return;
        session.invited.splice(session.invited.indexOf(id), 1);
        addSystemMessage(session.chatId, '「' + getDreamName(id) + '」无应答');
        renderCallUI();
        pendingCount--;
        checkAllDone();
      }, 15000);
    }
  });
}

function endCallSession(reason) {
  if (!state.callSession) return;
  var session = state.callSession;
  var duration = 0;
  if (session.startTime) duration = Math.floor((Date.now() - session.startTime) / 1000);
  var idx = state.activeCalls.indexOf(session);
  if (idx > -1) state.activeCalls.splice(idx, 1);
  var msg = session.startTime ? '通话结束，时长 ' + formatDuration(duration).slice(3) : (reason || '通话已取消');
  addSystemMessage(session.chatId, msg);
  state.callSession = null;
  state.callState = 'idle';
  if (state.callTimerInterval) clearInterval(state.callTimerInterval);
  state.callTimerInterval = null;
  document.getElementById('callOverlay').classList.remove('active');
  document.getElementById('callMini').classList.remove('show');
  saveState();
  renderCallUI();
}

function hangupCall() {
    // 清理通话界面残留的多人头像
  try {
    var cardEl = document.getElementById('callCard');
    if (cardEl) {
      var olds = cardEl.querySelectorAll('.multi-avatars');
      for (var i = 0; i < olds.length; i++) olds[i].remove();
      var oa = cardEl.querySelector('.call-avatar');
      if (oa) oa.style.display = '';
    }
  } catch(e) {}
  
  // ===== 第一步：无论如何，先强制关闭界面，防止用户卡死 =====
  try {
    var ov = document.getElementById('callOverlay');
    if (ov) ov.classList.remove('active');
    var mini = document.getElementById('callMini');
    if (mini) mini.classList.remove('show');
  } catch(e) {}
  if (state.callTimerInterval) { clearInterval(state.callTimerInterval); state.callTimerInterval = null; }

  // ===== 第二步：确定要写消息的聊天窗口，和通话开始时间 =====
  var chatId = null;
  var startTime = null;

  if (state.callSession) {
    chatId = state.callSession.chatId;
    startTime = state.callSession.startTime;
    // 从 activeCalls 里移除（防御式，检查字段是否存在）
    if (state.activeCalls && Array.isArray(state.activeCalls)) {
      var i = state.activeCalls.indexOf(state.callSession);
      if (i > -1) state.activeCalls.splice(i, 1);
    }
    state.callSession = null;
  } else if (state.currentChatId) {
    chatId = state.currentChatId;
    startTime = state.callStartTime;
  }

  // ===== 第三步：往聊天界面写入系统小字 =====
    var msg = '';
  var myName = state.profile.name || '我';
  if (startTime) {
    var dur = Math.floor((Date.now() - startTime) / 1000);
    msg = '通话结束，时长 ' + formatDuration(dur).slice(3);
  } else {
    if (state.callState === 'ringing') {
      msg = '「' + myName + '」拒绝了通话';
    } else if (state.callState === 'dialing') {
      msg = '「' + myName + '」取消了通话';
    } else {
      msg = '「' + myName + '」挂断了通话';
    }
  }

  if (chatId) {
    if (!state.chatSessions[chatId]) state.chatSessions[chatId] = [];
    state.chatSessions[chatId].push({ from: 'system', text: msg, time: Date.now() });
    if (state.currentChatId === chatId) {
      try { loadChatMessages(); renderChatMessages(); } catch(e) {}
    }
  }

  // ===== 第四步：清空状态 =====
  state.callState = 'idle';
  state.callStartTime = null;
  state.callElapsed = 0;
  try { saveState(); } catch(e) {}

  // ===== 调试信息：按 F12 能在控制台看到，方便定位问题 =====
  console.log('[hangupCall] 已执行，chatId =', chatId, '，msg =', msg);
}

function startCallTimer() {
  if (state.callTimerInterval) clearInterval(state.callTimerInterval);
  state.callTimerInterval = setInterval(function() {
    if (!state.callSession || !state.callSession.startTime) return;
    var elapsed = Math.floor((Date.now() - state.callSession.startTime) / 1000);
    var el = document.getElementById('callTimer');
    if (el) el.textContent = formatDuration(elapsed);
    var mini = document.getElementById('miniTime');
    if (mini) mini.textContent = formatDuration(elapsed).slice(0, 5);
  }, 1000);
}

function renderCallUI() {
  var overlay = document.getElementById('callOverlay');
  var card = document.getElementById('callCard');
  if (!overlay || !card) return;

  if (!state.callSession) {
    overlay.classList.remove('active');
    var olds0 = card.querySelectorAll('.multi-avatars');
    for (var i0 = 0; i0 < olds0.length; i0++) olds0[i0].remove();
    var oa0 = card.querySelector('.call-avatar');
    if (oa0) oa0.style.display = '';
    return;
  }

  var session = state.callSession;
  // 【修复1】严格过滤掉一切不是真实梦角的空数据
  var participants = session.participants.filter(function(id) {
    return id && id !== 'user' && id !== 'undefined' && id !== 'null';
  });

  var olds = card.querySelectorAll('.multi-avatars');
  for (var i = 0; i < olds.length; i++) olds[i].remove();

  var avatarsHtml = '<div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">';
  var showList = participants.length > 0 ? participants : (session.invited || []);
  showList = showList.filter(function(id){ return id && id !== 'user' && id !== 'undefined' && id !== 'null'; });
  showList.forEach(function(id) {
    var av = getDreamAvatar(id);
    avatarsHtml += '<div style="text-align:center;"><img src="' + av + '" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.3);"><div style="font-size:11px;color:#fff;margin-top:4px;">' + getDreamName(id) + '</div></div>';
  });
  avatarsHtml += '</div>';

  var div = document.createElement('div');
  div.className = 'multi-avatars';
  div.innerHTML = avatarsHtml;
  var originalAvatar = card.querySelector('.call-avatar');
  if (originalAvatar) originalAvatar.style.display = 'none';
  card.insertBefore(div, card.firstChild);

  // 【修复2】动态更新中间的名字，干掉“沈屿”
  var callNameEl = document.getElementById('callName');
  if (callNameEl) {
    if (participants.length === 0) {
      if (session.invited && session.invited.length > 0) {
        var names = session.invited.map(getDreamName).join('、');
        callNameEl.textContent = '正在呼叫 ' + names;
      } else {
        callNameEl.textContent = '正在呼叫…';
      }
    } else if (participants.length === 1) {
      callNameEl.textContent = getDreamName(participants[0]);
    } else {
      callNameEl.textContent = '多人通话';
    }
  }

  var statusEl = document.getElementById('callStatus');
  if (statusEl) {
    if (session.status === 'dialing') statusEl.textContent = '正在呼叫…';
    else if (session.status === 'ringing') statusEl.textContent = '来电中…';
    else if (session.status === 'connected') statusEl.textContent = '通话中';
    else statusEl.textContent = '';
  }

  var timerEl = document.getElementById('callTimer');
  if (timerEl) {
    if (session.status === 'connected') timerEl.classList.add('show');
    else timerEl.classList.remove('show');
  }

    var btns = document.getElementById('callButtons');
  if (btns) {
    var hangupBtnHtml = '<button class="call-btn hangup" onclick="hangupCall()"><div class="btn-icon"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(135deg);"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg></div><span>拒绝</span></button>';
    var answerBtnHtml = '<button class="call-btn answer" onclick="answerCall()"><div class="btn-icon"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg></div><span>接听</span></button>';
    
    if (session.status === 'dialing') {
      btns.innerHTML = '<button class="call-btn hangup" onclick="cancelDial()"><div class="btn-icon" style="background:#eb5545;"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(135deg);"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg></div><span>取消</span></button>';
    } else if (session.status === 'ringing') {
      btns.innerHTML = hangupBtnHtml + answerBtnHtml;
    } else {
      btns.innerHTML = '<button class="call-btn minimize" onclick="minimizeCall()">−</button>' + hangupBtnHtml;
    }
  }

  var bg = state.settings && state.settings.callBg;
  if (bg) card.style.background = 'url(' + bg + ') center/cover, linear-gradient(145deg,#1a1a2e,#16213e)';
  else card.style.background = 'linear-gradient(145deg,#1a1a2e,#16213e)';

  overlay.classList.add('active');
}

function getDreamAvatar(id) {
  var d = state.dreams.find(function(x) { return x.id === id; });
  if (d && d.avatar) return d.avatar;
  return 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2750%27 height=%2750%27 viewBox=%270 0 50 50%27%3E%3Ccircle cx=%2725%27 cy=%2725%27 r=%2725%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2725%27 y=%2730%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2720%27%3E💜%3C/text%3E%3C/svg%3E';
}

function closeCallSelect() {
  document.getElementById('callSelectPanel').style.display = 'none';
  document.getElementById('callSelectMask').style.display = 'none';
}

function confirmCallSelect() {
  var checked = document.querySelectorAll('#callSelectList input[type="checkbox"]:checked');
  var ids = [];
  checked.forEach(function(cb) { ids.push(cb.value); });
  if (ids.length === 0) { showToast('请至少选一个'); return; }
  closeCallSelect();
  startUserDial(ids);
}

function aiAcceptCall() {
  if (state.callState !== 'dialing') return;
  state.callState = 'connected';
  state.callStartTime = Date.now();
  state.callElapsed = 0;
    // 多人通话时显示所有人头像
  if (window.currentCallTargets && window.currentCallTargets.length > 1) {
    var avatarsHtml = '<div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">';
    window.currentCallTargets.forEach(function(id) {
      var m = state.dreams.find(function(d) { return d.id === id; });
      if (!m) return;
      var av = m.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2750%27 height=%2750%27 viewBox=%270 0 50 50%27%3E%3Ccircle cx=%2725%27 cy=%2725%27 r=%2725%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2725%27 y=%2730%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2720%27%3E💜%3C/text%3E%3C/svg%3E';
      avatarsHtml += '<div style="text-align:center;"><img src="' + av + '" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.3);"><div style="font-size:11px;color:#fff;margin-top:4px;">' + m.name + '</div></div>';
    });
    avatarsHtml += '</div>';
    var card = document.getElementById('callCard');
    var existing = card.querySelector('.multi-avatars');
    if (existing) existing.remove();
    var div = document.createElement('div');
    div.className = 'multi-avatars';
    div.innerHTML = avatarsHtml;
    var originalAvatar = card.querySelector('.call-avatar');
    if (originalAvatar) originalAvatar.style.display = 'none';
    card.insertBefore(div, card.firstChild);
  }
  document.getElementById('callStatus').textContent = '通话中';
  document.getElementById('callTimer').classList.add('show');
  document.getElementById('callButtons').innerHTML = '<button class="call-btn minimize" onclick="minimizeCall()">−</button><button class="call-btn hangup" onclick="hangupCall()">☎</button>';
  if (state.callTimerInterval) clearInterval(state.callTimerInterval);
  state.callTimerInterval = setInterval(function() {
    state.callElapsed = Math.floor((Date.now() - state.callStartTime) / 1000);
    document.getElementById('callTimer').textContent = formatDuration(state.callElapsed);
    document.getElementById('miniTime').textContent = formatDuration(state.callElapsed).slice(0,5);
  }, 1000);
}

function aiRejectCall() {
  if (state.callState !== 'dialing') return;
  document.getElementById('callStatus').textContent = '对方已拒绝';
  document.getElementById('callButtons').innerHTML = '';

  if (state.currentChatId) {
    if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
    var dreamName = '梦角';
    if (state.currentChatId) {
      var d = state.dreams.find(function(x){ return x.id === state.currentChatId; });
      if (d) dreamName = d.name;
    }
    state.chatSessions[state.currentChatId].push({ from: 'system', text: '「' + dreamName + '」拒绝了通话', time: Date.now() });
    saveState();
    loadChatMessages();
    renderChatMessages();
  }

  setTimeout(function() {
    state.callState = 'idle';
    document.getElementById('callOverlay').classList.remove('active');
  }, 1500);
}

function aiTimeoutCall() {
  if (state.callState !== 'dialing') return;
  document.getElementById('callStatus').textContent = '对方无应答';
  document.getElementById('callButtons').innerHTML = '';

  if (state.currentChatId) {
    if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
    var dreamName = '梦角';
    if (state.currentChatId) {
      var d = state.dreams.find(function(x){ return x.id === state.currentChatId; });
      if (d) dreamName = d.name;
    }
    state.chatSessions[state.currentChatId].push({ from: 'system', text: '「' + dreamName + '」无应答', time: Date.now() });
    saveState();
    loadChatMessages();
    renderChatMessages();
  }

  setTimeout(function() {
    state.callState = 'idle';
    document.getElementById('callOverlay').classList.remove('active');
  }, 1500);
}

function cancelDial() {
  if (!state.callSession) {
    // 兜底：如果没有callSession但也点了挂断，强制关界面
    state.callState = 'idle';
    document.getElementById('callOverlay').classList.remove('active');
    document.getElementById('callMini').classList.remove('show');
    return;
  }
  
  var session = state.callSession;
  
  // 1. 强制关闭界面
  document.getElementById('callOverlay').classList.remove('active');
  document.getElementById('callMini').classList.remove('show');
  state.callState = 'idle';
  
  // 2. 发一条系统消息
  var chatId = session.chatId || state.currentChatId;
  if (chatId) {
    if (!state.chatSessions[chatId]) state.chatSessions[chatId] = [];
        var myName = state.profile.name || '我';
    state.chatSessions[chatId].push({ from: 'system', text: '「' + myName + '」取消了通话', time: Date.now() });
    saveState();
    loadChatMessages();
    renderChatMessages();
  }

  // 3. 【核心修复】把当前通话从 activeCalls 中删掉，这样“闹钟”醒来就找不到它了
  if (state.activeCalls && Array.isArray(state.activeCalls)) {
    var idx = state.activeCalls.indexOf(session);
    if (idx > -1) state.activeCalls.splice(idx, 1);
  }
  state.callSession = null;
  
  // 4. 清理旧的计时器
  if (state.callTimerInterval) { 
    clearInterval(state.callTimerInterval); 
    state.callTimerInterval = null; 
  }
}
// ===== 通话迷你悬浮球拖拽 =====
function initCallMiniDrag() {
  var mini = document.getElementById('callMini');
  var phone = document.querySelector('.phone');
  if (!mini || !phone) return;
  
  var isDragging = false;
  var moved = false;
  var startX, startY, startLeft, startTop;

  function onStart(e) {
    var cx = e.touches ? e.touches[0].clientX : e.clientX;
    var cy = e.touches ? e.touches[0].clientY : e.clientY;
    var rect = mini.getBoundingClientRect();
    var phoneRect = phone.getBoundingClientRect();
    
    startX = cx;
    startY = cy;
    startLeft = rect.left - phoneRect.left;
    startTop = rect.top - phoneRect.top;
    
    moved = false;
    isDragging = true;
    
    mini.style.right = 'auto';
    mini.style.bottom = 'auto';
    mini.style.left = startLeft + 'px';
    mini.style.top = startTop + 'px';
    mini.style.transition = 'none';
  }

  function onMove(e) {
    if (!isDragging) return;
    var cx = e.touches ? e.touches[0].clientX : e.clientX;
    var cy = e.touches ? e.touches[0].clientY : e.clientY;
    var dx = cx - startX;
    var dy = cy - startY;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
    if (!moved) return;
    
    if (e.cancelable) e.preventDefault(); 
    
    var phoneRect = phone.getBoundingClientRect();
    var newLeft = startLeft + dx;
    var newTop = startTop + dy;
    
    // 核心：死死限制在手机框里
    if (newLeft < 0) newLeft = 0;
    if (newTop < 0) newTop = 0;
    if (newLeft > phoneRect.width - mini.offsetWidth) newLeft = phoneRect.width - mini.offsetWidth;
    if (newTop > phoneRect.height - mini.offsetHeight) newTop = phoneRect.height - mini.offsetHeight;

    mini.style.left = newLeft + 'px';
    mini.style.top = newTop + 'px';
  }

  function onEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    
    if (moved) {
      window.callMiniMoved = true;
      setTimeout(function() { window.callMiniMoved = false; }, 100);
    } else {
      expandCall();
    }
  }

  mini.addEventListener('touchstart', onStart, { passive: true });
  mini.addEventListener('touchmove', onMove, { passive: false });
  mini.addEventListener('touchend', onEnd);
  mini.addEventListener('touchcancel', onEnd);
  
  mini.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
}

// 立即执行
initCallMiniDrag();
  document.getElementById('callSelectMask').addEventListener('click', closeCallSelect);
// ===== 免打扰开关 =====
function initMuteToggle() {
  // 👇 智能判断当前是不是群聊
  var isGroup = state.currentChatId && state.currentChatId.startsWith('group_');
  var toggle = isGroup ? document.getElementById('muteToggle') : document.getElementById('muteTogglePrivate');
  
  if (!toggle) return;
  if (!state.mutedChats) state.mutedChats = [];
  var isMuted = state.mutedChats.indexOf(state.currentChatId) > -1;
  toggle.classList.toggle('on', isMuted);
  toggle.onclick = function() {
    if (!state.currentChatId) return;
    if (!state.mutedChats) state.mutedChats = [];
    var idx = state.mutedChats.indexOf(state.currentChatId);
    if (idx > -1) {
      state.mutedChats.splice(idx, 1);
      toggle.classList.remove('on');
      showToast('已取消免打扰');
    } else {
      state.mutedChats.push(state.currentChatId);
      toggle.classList.add('on');
      showToast('已开启免打扰');
    }
    saveState();
    renderChatList();
  };
}
// ===== 主动发消息（超过设定时间没聊，AI主动开口） =====
function checkAutoMessage() {
  if (!state.settings || !state.settings.autoMessageDelay) return;
  var threshold = parseInt(state.settings.autoMessageDelay);
  if (!threshold || threshold <= 0) return;
  if (state.callState !== 'idle') return;
  if (!state.dreams || state.dreams.length === 0) return;
  if (!state.lastActivityAt) state.lastActivityAt = {};

  var now = Date.now();
  
  // 【新增】：AI 主动在群聊发消息（3% 概率触发，避免太频繁）
  if (state.groups && state.groups.length > 0 && Math.random() < 0.03) {
    var g = state.groups[Math.floor(Math.random() * state.groups.length)];
    var lastAtG = state.lastActivityAt[g.id] || 0;
    if (now - lastAtG >= threshold) {
      var availableIds = g.memberIds.filter(function(id) {
        return !g.muteEndsAt || g.muteEndsAt[String(id)] === undefined;
      });
      if (availableIds.length > 0) {
        var senderId = availableIds[Math.floor(Math.random() * availableIds.length)];
        var sender = state.dreams.find(function(d) { return d.id === senderId; });
        if (sender) {
          var usableCards = getUsableCards(sender.id);
          if (usableCards.length > 0) {
            var card = usableCards[Math.floor(Math.random() * usableCards.length)];
            if (!state.chatSessions[g.id]) state.chatSessions[g.id] = [];
            state.chatSessions[g.id].push({
              from: 'dream',
              senderId: sender.id,
              senderAvatar: sender.avatar,
              text: card.text,
              time: now
            });
            state.lastActivityAt[g.id] = now;
            saveState();
            
            // 如果用户刚好在这个群聊里，实时刷新
            if (state.currentChatId === g.id) {
              loadChatMessages();
              renderChatMessages();
            }
            renderChatList();
                        // 如果群聊开启了免打扰，就不发系统通知
            if (!state.mutedChats || state.mutedChats.indexOf(g.id) === -1) {
              sendNotification(sender.name, card.text, g.id);
            }
          }
        }
      }
    }
  }

  // 【保留】：AI 私聊主动找我
  var candidates = [];
  state.dreams.forEach(function(d) {
    var lastAt = state.lastActivityAt[d.id] || 0;
    if (now - lastAt >= threshold) candidates.push(d);
  });
  if (candidates.length === 0) return;

  // 10% 概率真的发私聊，避免太机械
  if (Math.random() > 0.1) return;

  var picked = candidates[Math.floor(Math.random() * candidates.length)];
  var usableCards = getUsableCards(picked.id);
  var card = usableCards.length > 0
    ? usableCards[Math.floor(Math.random() * usableCards.length)]
    : null;
  var text = card ? card.text : '……';

  if (!state.chatSessions[picked.id]) state.chatSessions[picked.id] = [];

  // 👇 【断句逻辑插入点】
  var isSplit = (state.settings.cutEnabled !== false) && (Math.random() < 0.5);
  
  if (isSplit && text.length > 1) {
      var cutIndex = Math.floor(text.length * (0.4 + Math.random() * 0.2));
      var part1 = text.slice(0, cutIndex).trim();
      var part2 = text.slice(cutIndex).trim();
      
      var sendMode = Math.random();
      
      if (sendMode < 0.4) {
          state.chatSessions[picked.id].push({ from: 'dream', senderId: picked.id, senderAvatar: picked.avatar, text: part1, cut: 'end', time: now });
          sendNotification(picked.name, part1);
      } else if (sendMode < 0.8) {
          state.chatSessions[picked.id].push({ from: 'dream', senderId: picked.id, senderAvatar: picked.avatar, text: part2, cut: 'start', time: now });
          sendNotification(picked.name, part2);
      } else {
          state.chatSessions[picked.id].push({ from: 'dream', senderId: picked.id, senderAvatar: picked.avatar, text: part1, cut: 'end', time: now });
          sendNotification(picked.name, part1);
          
          setTimeout(function() {
              if (!state.chatSessions[picked.id]) return;
              state.chatSessions[picked.id].push({ from: 'dream', senderId: picked.id, senderAvatar: picked.avatar, text: part2, cut: 'start', time: Date.now() });
              saveState();
              if (state.currentChatId === picked.id && document.getElementById('pagePrivateChat').classList.contains('active')) {
                  loadChatMessages();
                  renderChatMessages();
              }
              renderChatList();
              sendNotification(picked.name, part2);
          }, 1500);
      }
  } else {
      state.chatSessions[picked.id].push({
        from: 'dream',
        senderId: picked.id,
        senderAvatar: picked.avatar,
        text: text,
        time: now
      });
            sendNotification(picked.name, text, picked.id);
  }

  state.lastActivityAt[picked.id] = now;
  saveState();

  if (state.currentChatId === picked.id && document.getElementById('pagePrivateChat').classList.contains('active')) {
    loadChatMessages();
    renderChatMessages();
  }
  renderChatList();
}
// ===== 群聊独立背景 =====
function handleGroupBg(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX_WIDTH = 800, width = img.width, height = img.height;
      if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      canvas.width = width; canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      var compressed = canvas.toDataURL('image/jpeg', 0.6);
      var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
      if (g) {
        g.chatBg = compressed;
        saveState();
        showToast('群聊背景已设置');
        renderChat();
      }
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}
// ===== 收藏箱 =====
function renderFavorites() {
  var container = document.getElementById('favoritesList');
  if (!container) return;
  if (!state.favorites || state.favorites.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:40px 20px;text-align:center;color:var(--gray);">还没有收藏任何消息</div>';
    return;
  }

  // 按添加时间倒序
  var sorted = state.favorites.slice().sort(function(a, b) { return b.addedAt - a.addedAt; });

  container.innerHTML = sorted.map(function(fav) {
    var t = new Date(fav.time);
    var dateStr = (t.getMonth()+1) + '月' + t.getDate() + '日 ' + String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');
    return `
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);background:var(--card);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:13px;font-weight:600;color:var(--text);">${fav.senderName}</span>
          <span style="font-size:11px;color:var(--gray);">${dateStr}</span>
        </div>
        <div style="font-size:14px;color:var(--text);line-height:1.4;margin-bottom:6px;word-break:break-word;">${fav.text}</div>
        <div style="font-size:11px;color:#576b95;margin-bottom:4px;">由 ${fav.favBy || (fav.isUser ? '我' : '梦角')} 收藏</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;color:#bbb;">${fav.chatName}</span>
          <span onclick="deleteFavorite('${fav.id}')" style="font-size:12px;color:var(--red);cursor:pointer;padding:4px 8px;">删除</span>
        </div>
      </div>
    `;
  }).join('');
}

function deleteFavorite(id) {
  if (!confirm('确定删除这条收藏？')) return;
  state.favorites = state.favorites.filter(function(f) { return f.id !== id; });
  saveState();
  renderFavorites();
  showToast('已删除');
}

// ===== 日记封面 =====
function renderDiaryCover() {
  if (!state.settings) state.settings = {};
  var cover = document.getElementById('diaryCover');
  if (cover) {
    if (state.settings.diaryCover) {
      cover.style.background = 'url("' + state.settings.diaryCover + '") center/cover no-repeat';
    } else {
      cover.style.background = 'linear-gradient(135deg, #a8c8e0, #7ec8e3)';
    }
  }

  var nameEl = document.getElementById('diaryCoverName');
  var statusEl = document.getElementById('diaryCoverStatus');
  var avatarEl = document.getElementById('diaryCoverAvatar');
  if (nameEl) nameEl.textContent = state.profile.name || '我';
  if (statusEl) statusEl.textContent = state.profile.status || '';
  if (avatarEl) {
    avatarEl.src = state.profile.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2776%27 height=%2776%27 viewBox=%270 0 76 76%27%3E%3Crect width=%2776%27 height=%2776%27 rx=%2712%27 fill=%27%23e8e8ed%27/%3E%3Ctext x=%2738%27 y=%2744%27 text-anchor=%27middle%27 fill=%27%2386868b%27 font-size=%2728%27%3E👤%3C/text%3E%3C/svg%3E';
  }
}

function changeDiaryCover() {
  var input = document.getElementById('diaryCoverInput');
  if (input) input.click();
}

function handleDiaryCover(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX_WIDTH = 900, width = img.width, height = img.height;
      if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      canvas.width = width; canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      var compressed = canvas.toDataURL('image/jpeg', 0.75);
      if (!state.settings) state.settings = {};
      state.settings.diaryCover = compressed;
      saveState();
      renderDiaryCover();
      showToast('封面已更新');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function deleteDiary(id) {
  if (!confirm('确定删除这篇日记吗？此操作不可恢复！')) return;
  state.diaries = state.diaries.filter(function(d) { return d.id !== id; });
  saveState();
  renderDiaryList();
  showToast('日记已删除');
}

// 打开写日记页面
var pickedMood = '';
var pickedWeather = '';

function openWriteDiary() {
  pickedMood = MOODS[0];
  pickedWeather = WEATHERS[0];

  var moodBox = document.getElementById('moodTags');
  moodBox.innerHTML = MOODS.map(function(m) {
    var isActive = m === pickedMood;
    return '<span onclick="pickMood(\'' + m + '\')" style="flex-shrink:0;font-size:13px;padding:6px 14px;border-radius:16px;cursor:pointer;background:' + (isActive ? 'var(--blue)' : 'var(--card)') + ';color:' + (isActive ? '#fff' : 'var(--text)') + ';border:1px solid var(--border);transition:all 0.15s;">' + m + '</span>';
  }).join('');

  var weatherBox = document.getElementById('weatherTags');
  weatherBox.innerHTML = WEATHERS.map(function(w) {
    var isActive = w === pickedWeather;
    return '<span onclick="pickWeather(\'' + w + '\')" style="flex-shrink:0;font-size:13px;padding:6px 14px;border-radius:16px;cursor:pointer;background:' + (isActive ? 'var(--blue)' : 'var(--card)') + ';color:' + (isActive ? '#fff' : 'var(--text)') + ';border:1px solid var(--border);transition:all 0.15s;">' + w + '</span>';
  }).join('');

  document.getElementById('diaryText').value = '';
  navigateTo('pageWriteDiary');
}

function pickMood(m) {
  pickedMood = m;
  var moodBox = document.getElementById('moodTags');
  moodBox.querySelectorAll('span').forEach(function(el) {
    var isActive = el.textContent === m;
    el.style.background = isActive ? 'var(--blue)' : 'var(--card)';
    el.style.color = isActive ? '#fff' : 'var(--text)';
  });
}

function pickWeather(w) {
  pickedWeather = w;
  var weatherBox = document.getElementById('weatherTags');
  weatherBox.querySelectorAll('span').forEach(function(el) {
    var isActive = el.textContent === w;
    el.style.background = isActive ? 'var(--blue)' : 'var(--card)';
    el.style.color = isActive ? '#fff' : 'var(--text)';
  });
}

// ===== 日记评论 =====
function openDiaryComment(diaryId) {
  var text = prompt('写下你的评论：');
  if (!text || !text.trim()) return;
  var diary = state.diaries.find(function(d) { return d.id === diaryId; });
  if (!diary) return;
  if (!diary.comments) diary.comments = [];
  diary.comments.push({
    id: 'cmt_' + Date.now(),
    authorId: 'user',
    authorName: state.profile.name || '我',
    authorAvatar: state.profile.avatar || '',
    text: text.trim(),
    time: Date.now()
  });
  saveState();
  renderDiaryList();
  showToast('评论已发布');

  // 触发 AI 回复（延迟 2-5 秒）
  setTimeout(function() { triggerAiComment(diaryId, 'user'); }, 2000 + Math.random() * 3000);
}

// 点击梦角评论 → 回复
function replyToDiaryComment(diaryId, commentId) {
  var diary = state.diaries.find(function(d) { return d.id === diaryId; });
  if (!diary || !diary.comments) return;
  var target = diary.comments.find(function(c) { return c.id === commentId; });
  if (!target) return;

  var text = prompt('回复 ' + target.authorName + '：');
  if (!text || !text.trim()) return;

  diary.comments.push({
    id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    authorId: 'user',
    authorName: state.profile.name || '我',
    authorAvatar: state.profile.avatar || '',
    text: text.trim(),
    time: Date.now(),
    replyTo: target.id,
    replyToName: target.authorName
  });
  saveState();
  renderDiaryList();
  showToast('回复已发布');

  // 触发梦角回应（延迟 2-5 秒）
  setTimeout(function() { triggerAiComment(diaryId, 'user'); }, 2000 + Math.random() * 3000);
}

function checkAutoDiaryComments() {
  if (!state.diaries || state.diaries.length === 0) return;
  // 只处理最近 5 篇日记
  var recent = state.diaries.slice().sort(function(a, b) { return b.time - a.time; }).slice(0, 5);
  recent.forEach(function(diary) {
    if (Math.random() < 0.15) {
      triggerAiComment(diary.id, null);
    }
  });
}

setInterval(checkAutoDiaryComments, 60000);

// ===== 主屏幕背景 =====
function handleHomeBg(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX_WIDTH = 900, width = img.width, height = img.height;
      if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      canvas.width = width; canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      var compressed = canvas.toDataURL('image/jpeg', 0.7);
      if (!state.settings) state.settings = {};
      state.settings.homeBg = compressed;
      saveState();
      applyHomeBg();
      showToast('主屏幕背景已设置');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function resetHomeBg() {
  if (!state.settings) return;
  state.settings.homeBg = null;
  saveState();
  applyHomeBg();
  showToast('已清除主屏幕背景');
}

function applyHomeBg() {
  var home = document.getElementById('pageHome');
  if (!home) return;
  var bg = state.settings && state.settings.homeBg;
  if (bg) {
    home.style.background = 'url("' + bg + '") center/cover no-repeat';
  } else {
    home.style.background = '';
  }
}

// ===== 已读不回开关 =====
function initReadNoReplyToggle() {
  // 👇 智能判断当前是不是群聊
  var isGroup = state.currentChatId && state.currentChatId.startsWith('group_');
  var toggle = isGroup ? document.getElementById('readNoReplyToggle') : document.getElementById('readNoReplyTogglePrivate');
  
  if (!toggle) return;
  var cs = getCurrentChatSettings();
  toggle.classList.toggle('on', !!cs.readNoReply);
  toggle.onclick = function() {
    cs.readNoReply = !cs.readNoReply;
    toggle.classList.toggle('on', cs.readNoReply);
    saveState();
    showToast(cs.readNoReply ? '已开启已读不回' : '已关闭已读不回');
  };
}

// ===== 信箱系统 =====
var currentMailTab = 'inbox';

// 生成送达时间（10-48小时）
function genDeliverTime() {
  var h = 10 + Math.random() * 38;
  return Date.now() + h * 3600 * 1000;
}

// 写信按钮
function openWriteLetter() {
  var sel = document.getElementById('letterTarget');
  if (!state.dreams || state.dreams.length === 0) { showToast('还没有梦角'); return; }
  sel.innerHTML = state.dreams.map(function(d) {
    return '<option value="' + d.id + '">' + d.name + '</option>';
  }).join('');
  document.getElementById('letterContent').value = '';
  navigateTo('pageWriteLetter');
}

// 发送信件
function sendLetter() {
  var targetId = document.getElementById('letterTarget').value;
  var content = document.getElementById('letterContent').value.trim();
  if (!content) { showToast('信件内容不能为空'); return; }
  if (!state.mails) state.mails = [];
  var target = state.dreams.find(function(d) { return d.id === targetId; });
  if (!target) return;

  state.mails.push({
    id: 'mail_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    from: 'user',
    fromId: 'user',
    fromName: state.profile.name || '我',
    toId: targetId,
    toName: target.name,
    content: content,
    sentAt: Date.now(),
    deliverAt: genDeliverTime(),
    delivered: false,
    isReply: false
  });
  saveState();
  showToast('信件已寄出，预计 10-48 小时送达');
  navigateTo('pageMailbox');
  switchMailTab('outbox');
}

// 切换收件箱/发件箱
function switchMailTab(tab) {
  currentMailTab = tab;
  var inbox = document.getElementById('mailTabInbox');
  var outbox = document.getElementById('mailTabOutbox');
  if (tab === 'inbox') {
    inbox.style.color = 'var(--blue)'; inbox.style.borderBottom = '2px solid var(--blue)';
    outbox.style.color = 'var(--gray)'; outbox.style.borderBottom = '2px solid transparent';
  } else {
    outbox.style.color = 'var(--blue)'; outbox.style.borderBottom = '2px solid var(--blue)';
    inbox.style.color = 'var(--gray)'; inbox.style.borderBottom = '2px solid transparent';
  }
  renderMailList();
}

// 渲染信件列表
function renderMailList() {
  var list = document.getElementById('mailList');
  if (!list) return;
  if (!state.mails) state.mails = [];

  var filtered = state.mails.filter(function(m) {
    if (currentMailTab === 'inbox') return m.from !== 'user';
    else return m.from === 'user';
  });
  filtered.sort(function(a, b) { return b.sentAt - a.sentAt; });

  var unreadCount = state.mails.filter(function(m) { return m.from !== 'user' && !m.read; }).length;
  var badge = document.getElementById('mailUnreadBadge');
  if (badge) {
    if (unreadCount > 0) { badge.textContent = unreadCount; badge.style.display = 'inline-block'; }
    else badge.style.display = 'none';
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div style="padding:50px 20px;text-align:center;color:var(--gray);font-size:14px;">' + (currentMailTab === 'inbox' ? '还没有收到信' : '还没有寄出过信') + '</div>';
    return;
  }

  list.innerHTML = filtered.map(function(m) {
    var t = new Date(m.sentAt);
    var timeStr = (t.getMonth()+1) + '/' + t.getDate() + ' ' + String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');
    var statusHtml = '';
    var dotHtml = '';
    if (m.from === 'user') {
      if (m.delivered) statusHtml = '<span style="font-size:11px;color:var(--green);">已送达</span>';
      else {
        var left = Math.max(0, m.deliverAt - Date.now());
        var hLeft = Math.floor(left / 3600000);
        var mLeft = Math.floor((left % 3600000) / 60000);
        statusHtml = '<span style="font-size:11px;color:var(--gray);">运送中 · 剩 ' + hLeft + 'h' + mLeft + 'm</span>';
      }
    } else {
      if (!m.read) {
        dotHtml = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff3b30;margin-right:6px;vertical-align:middle;"></span>';
      }
    }

    var whoText = m.from === 'user' ? ('寄给 ' + m.toName) : ('来自 ' + m.fromName);
if (m.isAutoLetter) whoText += ' <span style="font-size:10px;color:#ff9500;background:rgba(255,149,0,0.1);padding:1px 4px;border-radius:4px;margin-left:4px;font-weight:400;">主动来信</span>';
    var preview = m.content.replace(/\n/g, ' ').slice(0, 30);

    return '<div onclick="openLetterDetail(\'' + m.id + '\')" style="padding:14px 16px;border-bottom:1px solid var(--border);background:var(--card);cursor:pointer;position:relative;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
        '<span style="font-size:14px;font-weight:600;color:var(--text);">' + dotHtml + whoText + '</span>' +
        '<div style="display:flex;align-items:center;">' +
          statusHtml +
          '<span onclick="event.stopPropagation();deleteMail(\'' + m.id + '\')" style="font-size:12px;color:var(--red);cursor:pointer;padding:4px 8px;margin-left:8px;border-radius:8px;background:rgba(255,59,48,0.1);user-select:none;">🗑 删除</span>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:13px;color:var(--gray);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + preview + '</div>' +
      '<div style="font-size:11px;color:#bbb;margin-top:4px;">' + timeStr + '</div>' +
    '</div>';
  }).join('');
}

function deleteMail(id) {
  if (!confirm('确定删除这封信吗？此操作不可恢复！')) return;
  state.mails = state.mails.filter(function(m) { return m.id !== id; });
  saveState();
  renderMailList();
  showToast('信件已删除');
}

// 打开信件详情
function openLetterDetail(id) {
  var m = state.mails.find(function(x) { return x.id === id; });
  if (!m) return;
  // 标记为已读
  if (m.from !== 'user' && !m.read) {
    m.read = true;
    saveState();
  }
  var t = new Date(m.sentAt);
  var timeStr = (t.getMonth()+1) + '月' + t.getDate() + '日 ' + String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');

  document.getElementById('letterDetailTitle').textContent = m.from === 'user' ? '寄给 ' + m.toName : '来自 ' + m.fromName;
if (m.isAutoLetter) document.getElementById('letterDetailTitle').textContent += ' · 主动来信';
  var html = '<div style="padding:20px;">';
  html += '<div style="font-size:12px;color:var(--gray);margin-bottom:16px;text-align:center;">' + timeStr + '</div>';
  html += '<div style="background:var(--card);border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.05);line-height:1.8;font-size:14px;color:var(--text);white-space:pre-wrap;word-break:break-word;">' + m.content + '</div>';
  if (m.from === 'user' && !m.delivered) {
    html += '<div style="text-align:center;margin-top:16px;font-size:12px;color:var(--gray);">信件还在运送中……</div>';
  }
  html += '</div>';
  document.getElementById('letterDetailContent').innerHTML = html;
  navigateTo('pageLetterDetail');
  renderMailList();
}

function checkAutoLetter() {
  if (!state.dreams || state.dreams.length === 0) return;
  if (!state.cards || state.cards.length === 0) return;
  if (!state.mails) state.mails = [];

  // 4.5% 概率触发，想调大就改这里：0.0001 = 0.01%，0.01 = 1%，0.001 = 0.1%
  if (Math.random() > 0.01) return;

  // 随机挑一个梦角
  var dream = state.dreams[Math.floor(Math.random() * state.dreams.length)];

  // 从字卡库随机挑 8-15 条，组合成一封信
  var count = 8 + Math.floor(Math.random() * 8);
  var usableCards = getUsableCards(dream.id);
  if (usableCards.length === 0) return;
  var shuffled = usableCards.sort(function() { return Math.random() - 0.5; });
  var picked = shuffled.slice(0, Math.min(count, shuffled.length));
  var content = picked.map(function(c) { return c.text; }).join('\n');

  // 创建信件（立即送达）
  state.mails.push({
    id: 'mail_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    from: 'dream',
    fromId: dream.id,
    fromName: dream.name,
    fromAvatar: dream.avatar || '',
    toId: 'user',
    toName: state.profile.name || '我',
    content: content,
    sentAt: Date.now(),
    deliverAt: Date.now(),
    delivered: true,
    read: false,
    isReply: false,
    isAutoLetter: true
  });

  saveState();

  // 如果你正在信箱页面，实时刷新列表
  var mailboxPage = document.getElementById('pageMailbox');
  if (mailboxPage && mailboxPage.classList.contains('active')) {
    renderMailList();
  }

  // 弹通知
  sendNotification(dream.name, '给你写了一封信');
}

// ===== 信箱定时：送达检查 + 梦角回信 =====
function checkMailDelivery() {
  if (!state.mails || state.mails.length === 0) return;
  var now = Date.now();
  var changed = false;

  // 1. 检查送达
  state.mails.forEach(function(m) {
    if (m.from === 'user' && !m.delivered && now >= m.deliverAt) {
      m.delivered = true;
      changed = true;
      // 触发梦角回信（延迟一会）
      setTimeout(function() { aiReplyLetter(m.id); }, 3000 + Math.random() * 5000);
    }
  });

  if (changed) { saveState(); renderMailList(); }
}

// 梦角回信：从字卡库随机挑 8-15 条组合
function aiReplyLetter(letterId) {
  var original = state.mails.find(function(x) { return x.id === letterId; });
  if (!original) return;
  var dream = state.dreams.find(function(d) { return d.id === original.toId; });
  if (!dream) return;
  if (!state.cards || state.cards.length === 0) return;

  // 从字卡库随机 8-15 条
  var count = 8 + Math.floor(Math.random() * 8);
  var usableCards = getUsableCards(dream.id);
  if (usableCards.length === 0) return;
  var shuffled = usableCards.sort(function() { return Math.random() - 0.5; });
  var picked = shuffled.slice(0, Math.min(count, shuffled.length));
  var lines = picked.map(function(c) { return c.text; });
  var content = lines.join('\n');

  state.mails.push({
    id: 'mail_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    from: 'dream',
    fromId: dream.id,
    fromName: dream.name,
    fromAvatar: dream.avatar || '',
    toId: 'user',
    toName: state.profile.name || '我',
    content: content,
    sentAt: Date.now(),
    deliverAt: Date.now(),
    delivered: true,
    read: false,
    isReply: true,
    replyToId: original.id
  });
  saveState();
  renderMailList();
  sendNotification(dream.name, '给你回信了');
}

// 检测信箱未读（红点）
function updateMailboxBadge() {
  // 主页图标红点 - 暂时不做，先留着
}

// ===== 状态检测 =====
function getStatusData(dreamId) {
  if (!state.settings) state.settings = {};
  if (!state.settings.statusData) state.settings.statusData = {};
  if (!state.settings.statusData[dreamId]) {
    state.settings.statusData[dreamId] = {
      moodValues: ['开心', '平静', '想你', '有点累', '满足', '幸福'],
      doingValues: ['正在看书', '正在发呆', '正在想你', '正在工作', '正在休息', '正在散步'],
      cooldownUntil: 0
    };
  }
  return state.settings.statusData[dreamId];
}

function openStatusCheck() {
  document.getElementById('actionMenuPanel').style.display = 'none';
  var isGroup = state.currentChatId && state.currentChatId.startsWith('group_');
  if (isGroup) {
    var g = state.groups.find(function(item) { return item.id === state.currentChatId; });
    if (!g || g.memberIds.length === 0) { showToast('群成员为空'); return; }
    var list = document.getElementById('statusPickList');
    list.innerHTML = g.memberIds.map(function(id) {
      var m = state.dreams.find(function(d) { return d.id === id; });
      if (!m) return '';
      var avatar = m.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2736%27 height=%2736%27 viewBox=%270 0 36 36%27%3E%3Ccircle cx=%2718%27 cy=%2718%27 r=%2718%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2718%27 y=%2723%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2714%27%3E💜%3C/text%3E%3C/svg%3E';
      return '<div onclick="pickStatusTarget(\'' + m.id + '\')" style="display:flex;align-items:center;padding:10px 12px;border-radius:12px;background:#f8f8fa;cursor:pointer;"><img src="' + avatar + '" style="width:36px;height:36px;border-radius:50%;margin-right:10px;object-fit:cover;"><span style="font-size:14px;color:#333;">' + m.name + '</span></div>';
    }).join('');
    document.getElementById('statusPickPanel').style.display = 'block';
    document.getElementById('statusPickMask').style.display = 'block';
    return;
  }
  if (!state.currentChatId) { showToast('请先进入聊天'); return; }
  doStatusCheck(state.currentChatId);
}

function pickStatusTarget(dreamId) {
  closeStatusPick();
  doStatusCheck(dreamId);
}

function closeStatusPick() {
  document.getElementById('statusPickPanel').style.display = 'none';
  document.getElementById('statusPickMask').style.display = 'none';
}

function doStatusCheck(dreamId) {
  var dream = state.dreams.find(function(d) { return d.id === dreamId; });
  if (!dream) { showToast('梦角不存在'); return; }
  var data = getStatusData(dreamId);

       var now = Date.now();
  
  // 如果还在5分钟冷却期内，并且之前测过（有结果），就把上次的结果直接展示出来
  if (data.cooldownUntil > now && data.lastResult) {
    renderStatusPanel(dream, data.lastResult.moodVal, data.lastResult.energyVal, data.lastResult.moodText, data.lastResult.doingText);
    return;
  }

    var moodVal = 30 + Math.floor(Math.random() * 70);
  var energyVal = 20 + Math.floor(Math.random() * 80);
  var moodText = data.moodValues.length > 0 ? data.moodValues[Math.floor(Math.random() * data.moodValues.length)] : '……';
  var doingText = data.doingValues.length > 0 ? data.doingValues[Math.floor(Math.random() * data.doingValues.length)] : '……';

  data.cooldownUntil = Date.now() + 5 * 60 * 1000;
  data.lastResult = { moodVal: moodVal, energyVal: energyVal, moodText: moodText, doingText: doingText };
  
  saveState();
  renderStatusPanel(dream, moodVal, energyVal, moodText, doingText);
}

function renderStatusPanel(dream, moodVal, energyVal, moodText, doingText) {
  var avatar = dream.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2744%27 height=%2744%27 viewBox=%270 0 44 44%27%3E%3Ccircle cx=%2722%27 cy=%2722%27 r=%2722%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2722%27 y=%2726%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2720%27%3E💜%3C/text%3E%3C/svg%3E';
  var html = '';
  html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">';
  html += '<img src="' + avatar + '" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">';
  html += '<span style="font-size:16px;font-weight:600;color:var(--text);">' + dream.name + '</span>';
  html += '</div>';

  html += '<div class="status-bar-item">';
  html += '<div class="status-icon">💗</div>';
  html += '<div class="status-info">';
  html += '<div class="status-label">心情值</div>';
  html += '<div style="display:flex;align-items:center;"><div class="status-bar-track"><div class="status-bar-fill mood" style="width:' + moodVal + '%;"></div></div><span class="status-bar-num">' + moodVal + '%</span></div>';
  html += '</div></div>';

  html += '<div class="status-bar-item">';
  html += '<div class="status-icon">⚡</div>';
  html += '<div class="status-info">';
  html += '<div class="status-label">能量值</div>';
  html += '<div style="display:flex;align-items:center;"><div class="status-bar-track"><div class="status-bar-fill energy" style="width:' + energyVal + '%;"></div></div><span class="status-bar-num">' + energyVal + '%</span></div>';
  html += '</div></div>';

  html += '<div class="status-card">';
  html += '<div class="status-mood-text">' + moodText + '</div>';
  html += '<div class="status-doing-label">正在做什么</div>';
  html += '<div class="status-doing-text">' + doingText + '</div>';
  html += '</div>';

  html += '<button class="btn-secondary" onclick="openStatusEdit(\'' + dream.id + '\')" style="width:100%;margin-top:8px;">编辑词库</button>';

  document.getElementById('statusContent').innerHTML = html;
  document.getElementById('statusPanel').style.display = 'block';
  document.getElementById('statusMask').style.display = 'block';
}

function showCooldownPanel(dream, cdUntil) {
  var html = '';
  html += '<div class="status-cooldown">';
  html += '<div style="font-size:13px;color:var(--gray);">' + dream.name + ' 的状态还在冷却中</div>';
  html += '<div class="cd-time" id="statusCdTime">00:00</div>';
  html += '<div style="font-size:12px;color:#bbb;">5 分钟后可再次检测</div>';
  html += '</div>';
  document.getElementById('statusContent').innerHTML = html;
  document.getElementById('statusPanel').style.display = 'block';
  document.getElementById('statusMask').style.display = 'block';

  if (window.statusCdTimer) clearInterval(window.statusCdTimer);
  window.statusCdTimer = setInterval(function() {
    var el = document.getElementById('statusCdTime');
    if (!el) { clearInterval(window.statusCdTimer); return; }
    var left = Math.max(0, cdUntil - Date.now());
    if (left <= 0) {
      clearInterval(window.statusCdTimer);
      window.statusCdTimer = null;
      doStatusCheck(dream.id);
      return;
    }
    var m = Math.floor(left / 60000);
    var s = Math.floor((left % 60000) / 1000);
    el.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }, 1000);
}

function closeStatusCheck() {
  document.getElementById('statusPanel').style.display = 'none';
  document.getElementById('statusMask').style.display = 'none';
  if (window.statusCdTimer) { clearInterval(window.statusCdTimer); window.statusCdTimer = null; }
}

// ===== 编辑词库 =====
function openStatusEdit(dreamId) {
  var data = getStatusData(dreamId);
  var dream = state.dreams.find(function(d) { return d.id === dreamId; });
  if (!dream) return;

  var html = '';
  html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">心情文字</div>';
  html += '<div>';
  data.moodValues.forEach(function(v, i) {
    html += '<div class="status-edit-row"><input type="text" value="' + v.replace(/"/g, '&quot;') + '" onchange="updateStatusMood(\'' + dreamId + '\',' + i + ',this.value)"><span class="del-btn" onclick="deleteStatusMood(\'' + dreamId + '\',' + i + ')">×</span></div>';
  });
  html += '</div>';
  html += '<button class="status-add-btn" onclick="addStatusMood(\'' + dreamId + '\')">+ 添加心情</button>';

  html += '<div style="font-size:13px;font-weight:600;margin:16px 0 8px;">正在做什么</div>';
  html += '<div>';
  data.doingValues.forEach(function(v, i) {
    html += '<div class="status-edit-row"><input type="text" value="' + v.replace(/"/g, '&quot;') + '" onchange="updateStatusDoing(\'' + dreamId + '\',' + i + ',this.value)"><span class="del-btn" onclick="deleteStatusDoing(\'' + dreamId + '\',' + i + ')">×</span></div>';
  });
  html += '</div>';
  html += '<button class="status-add-btn" onclick="addStatusDoing(\'' + dreamId + '\')">+ 添加状态</button>';

  html += '<div style="display:flex;gap:8px;margin-top:20px;">';
  html += '<button class="btn-primary" onclick="closeStatusCheck()" style="flex:1;">完成</button>';
  html += '</div>';

  document.getElementById('statusContent').innerHTML = html;
}

function updateStatusMood(dreamId, idx, val) {
  var data = getStatusData(dreamId);
  if (idx >= 0 && idx < data.moodValues.length) { data.moodValues[idx] = val; saveState(); }
}
function deleteStatusMood(dreamId, idx) {
  var data = getStatusData(dreamId);
  data.moodValues.splice(idx, 1);
  if (data.moodValues.length === 0) data.moodValues.push('……');
  saveState();
  openStatusEdit(dreamId);
}
function addStatusMood(dreamId) {
  var data = getStatusData(dreamId);
  data.moodValues.push('新心情');
  saveState();
  openStatusEdit(dreamId);
}

function updateStatusDoing(dreamId, idx, val) {
  var data = getStatusData(dreamId);
  if (idx >= 0 && idx < data.doingValues.length) { data.doingValues[idx] = val; saveState(); }
}
function deleteStatusDoing(dreamId, idx) {
  var data = getStatusData(dreamId);
  data.doingValues.splice(idx, 1);
  if (data.doingValues.length === 0) data.doingValues.push('……');
  saveState();
  openStatusEdit(dreamId);
}
function addStatusDoing(dreamId) {
  var data = getStatusData(dreamId);
  data.doingValues.push('正在做什么');
  saveState();
  openStatusEdit(dreamId);
}

// 遮罩点击关闭
document.getElementById('statusMask').addEventListener('click', closeStatusCheck);
document.getElementById('statusPickMask').addEventListener('click', closeStatusPick);

// ===== 覆盖 AI 群主行为：只增加禁言用户，不踢人 =====
var originalAiGroupOwnerAction = aiGroupOwnerAction;
aiGroupOwnerAction = function(g) {
  var owner = state.dreams.find(function(d) { return d.id === g.ownerId; });
  if (!owner) return;

  // 新增：AI群主有 20% 的概率禁言用户
  if (g.ownerId !== 'user' && Math.random() < 0.2) {
    if (!g.muteEndsAt) g.muteEndsAt = {};
    if (g.muteEndsAt['user'] === undefined) {
      var mins = [5, 10, 15][Math.floor(Math.random() * 3)];
      g.muteEndsAt['user'] = Date.now() + mins * 60000;
      var sysText = '群主「' + owner.name + '」禁言了你 ' + mins + ' 分钟';
      if (!state.chatSessions[g.id]) state.chatSessions[g.id] = [];
      state.chatSessions[g.id].push({ from: 'system', text: sysText, time: Date.now() });
      saveState();
      if (state.currentChatId === g.id) {
        loadChatMessages();
        renderChatMessages();
      }
      showToast(sysText);
      return; // 禁言完成后直接返回，不执行后面的踢人/转让逻辑
    }
  }

  // 如果没有触发禁言，就调用原有的逻辑（保证以前的功能不丢失）
  originalAiGroupOwnerAction(g);
};

function joinActiveCall(sessionId) {
  if (!state.activeCalls) return;
  var session = state.activeCalls.find(function(c) { return c.id === sessionId; });
  if (!session) { showToast('该通话已结束'); renderChatMessages(); return; }
  if (session.participants.indexOf('user') > -1) { showToast('你已经在这个通话里了'); return; }
  if (state.callState !== 'idle') { showToast('你正在其他通话中，无法加入'); return; }

  session.participants.push('user');
  session.userInCall = true;
  state.callSession = session;
  state.callState = session.startTime ? 'connected' : 'dialing';

  addSystemMessage(session.chatId, '「' + (state.profile.name || '我') + '」加入了通话');
  saveState();

  if (session.startTime) {
    startCallTimer();
    document.getElementById('callOverlay').classList.add('active');
  }
  renderCallUI();
}

// ===== AI 通话模拟：AI 之间互相加入/退出，偶尔邀请用户 =====
function startAICallSimulation(session, group) {
  function getAIParticipants() {
    return session.participants.filter(function(id) { return String(id) !== 'user'; });
  }

  function tick() {
    if (state.activeCalls.indexOf(session) === -1) return;
    var aiParts = getAIParticipants();

    // 【修复2】如果 AI 都退出了，只剩下用户，自动帮用户挂断
    if (aiParts.length === 0 && session.participants.indexOf('user') > -1) {
      addSystemMessage(group.id, '其他成员已全部退出，通话结束');
      if (state.callSession && state.callSession.id === session.id) {
        state.callSession = null;
        state.callState = 'idle';
        document.getElementById('callOverlay').classList.remove('active');
        if (state.callTimerInterval) { clearInterval(state.callTimerInterval); state.callTimerInterval = null; }
        renderCallUI();
      }
      endAICall(session, group);
      return;
    }

    if (session.participants.length < 2 && session.participants.indexOf('user') === -1) {
      endAICall(session, group); return;
    }

    var roll = Math.random();

    // 30% 一个 AI 退出
    if (roll < 0.30 && aiParts.length > 0) {
      var leaver = aiParts[Math.floor(Math.random() * aiParts.length)];
      var li = session.participants.indexOf(leaver);
      if (li > -1) session.participants.splice(li, 1);
      addSystemMessage(group.id, '「' + getDreamName(leaver) + '」退出了通话');
      
      // 【修复3】AI 退出时，如果用户在看通话界面，立刻刷新让头像消失
      if (state.callSession && state.callSession.id === session.id) {
        renderCallUI();
      }
    }
    // 25% 一个不在通话里的 AI 加入
    else if (roll < 0.55) {
      var notInCall = group.memberIds.filter(function(id) {
        return String(id) !== 'user' && session.participants.indexOf(id) === -1;
      });
      if (notInCall.length > 0) {
        var joiner = notInCall[Math.floor(Math.random() * notInCall.length)];
        session.participants.push(joiner);
        addSystemMessage(group.id, '「' + getDreamName(joiner) + '」加入了通话');
        if (state.callSession && state.callSession.id === session.id) {
          renderCallUI();
        }
      }
    }
    // 15% AI 邀请用户加入
    else if (roll < 0.70) {
      if (session.participants.indexOf('user') === -1 && aiParts.length > 0 && !session.userInvited) {
        var inviter = aiParts[Math.floor(Math.random() * aiParts.length)];
        if (state.callState === 'idle') {
          session.userInvited = true;
          if (!session.invited) session.invited = [];
          if (session.invited.indexOf('user') === -1) session.invited.push('user');
          addSystemMessage(group.id, '「' + getDreamName(inviter) + '」邀请你加入通话');
          setTimeout(function() {
            var userConfirmed = confirm('「' + getDreamName(inviter) + '」邀请你加入通话，是否加入？');
            if (userConfirmed) {
              joinActiveCall(session.id);
            } else {
              var ui = session.invited.indexOf('user');
              if (ui > -1) session.invited.splice(ui, 1);
              addSystemMessage(group.id, '你拒绝了通话邀请');
              saveState();
            }
          }, 100);
        }
      }
    }

    saveState();
    setTimeout(tick, 8000 + Math.random() * 10000);
  }

  setTimeout(tick, 8000 + Math.random() * 7000);
}

function endAICall(session, group) {
  var idx = state.activeCalls.indexOf(session);
  if (idx === -1) return;
  state.activeCalls.splice(idx, 1);
  var dur = 0;
  if (session.startTime) dur = Math.floor((Date.now() - session.startTime) / 1000);
  addSystemMessage(group.id, '通话结束，时长 ' + formatDuration(dur).slice(3));
  saveState();

  // 【核心修复】如果用户还在这个通话界面上，强行帮用户关掉！
  if (state.callSession && state.callSession.id === session.id) {
    state.callSession = null;
    state.callState = 'idle';
    if (state.callTimerInterval) { clearInterval(state.callTimerInterval); state.callTimerInterval = null; }
    var ov = document.getElementById('callOverlay');
    if (ov) ov.classList.remove('active');
    var mini = document.getElementById('callMini');
    if (mini) mini.classList.remove('show');
    renderCallUI();
  }
}

function joinActiveCallFromBanner() {
  if (!state.activeCalls || !state.currentChatId) return;
  var bannerCall = null;
  for (var i = 0; i < state.activeCalls.length; i++) {
    var c = state.activeCalls[i];
    if (c.chatId === state.currentChatId && c.participants.indexOf('user') === -1) {
      bannerCall = c; break;
    }
  }
  if (bannerCall) joinActiveCall(bannerCall.id);
}

// ===== 首次进入欢迎面板 =====
function showWelcomeIfFirstTime() {
  try {
    if (!localStorage.getItem('mind_welcome_shown')) {
      var el = document.getElementById('welcomeOverlay');
      if (el) el.style.display = 'flex';
    }
  } catch(e) {}
}

function closeWelcome() {
  var el = document.getElementById('welcomeOverlay');
  if (el) el.style.display = 'none';
  try { localStorage.setItem('mind_welcome_shown', '1'); } catch(e) {}
}

// 等页面加载后自动检查

// ===== 修复长按菜单：点遮罩关闭 =====
(function() {
  function bind() {
    var mask = document.getElementById('msgMenuMask');
    if (mask && !mask._bound) {
      mask._bound = true;
      mask.addEventListener('click', function() {
        hideMsgMenu();
      });
      mask.addEventListener('touchstart', function(e) {
        e.preventDefault();
        hideMsgMenu();
      }, { passive: false });
    }
  }
  bind();
  setTimeout(bind, 500);
})();

// ===== 表情包管理页面 =====
function renderStickerGroups() {
  var container = document.getElementById('stickerGroupsContainer');
  if (!container) return;
  var html = '';

  stickerGroups.forEach(function(g, idx) {
    var count = (g.items || []).length;
    var collapsed = g.collapsed || false;

    html += '<div class="sticker-group-card" style="background:var(--card);border-radius:14px;padding:14px 16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<div onclick="toggleStickerGroupCollapse(\'' + g.id + '\')" style="flex:1;display:flex;align-items:center;gap:6px;cursor:pointer;">';
    html += '<span style="font-size:12px;color:var(--gray);transition:transform 0.2s;display:inline-block;' + (collapsed ? 'transform:rotate(-90deg);' : '') + '">▼</span>';
    html += '<span style="font-size:15px;font-weight:600;color:var(--text);">' + g.name + '（' + count + '）</span>';
    html += '</div>';
    html += '<div style="display:flex;gap:4px;align-items:center;">';
    html += '<span onclick="renameStickerGroup(\'' + g.id + '\')" style="cursor:pointer;font-size:14px;padding:2px 6px;">✎</span>';
    html += '<span onclick="moveStickerGroup(\'' + g.id + '\',-1)" style="cursor:pointer;font-size:14px;padding:2px 6px;">↑</span>';
    html += '<span onclick="moveStickerGroup(\'' + g.id + '\',1)" style="cursor:pointer;font-size:14px;padding:2px 6px;">↓</span>';
    html += '<span onclick="deleteStickerGroup(\'' + g.id + '\')" style="cursor:pointer;font-size:14px;padding:2px 6px;">🗑</span>';
    html += '</div>';
    html += '</div>';

    if (!collapsed) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;margin-bottom:10px;">';
      (g.items || []).forEach(function(item, itemIdx) {
        html += '<div style="position:relative;width:60px;height:60px;flex-shrink:0;">';
        html += '<img src="' + item + '" style="width:60px;height:60px;max-width:60px;max-height:60px;border-radius:8px;object-fit:contain;display:block;background:#f0f0f5;">';
        html += '<span onclick="deleteStickerFromGroup(\'' + g.id + '\',' + itemIdx + ')" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--red);color:#fff;font-size:14px;text-align:center;line-height:20px;cursor:pointer;z-index:10;">×</span>';
        html += '</div>';
      });
      html += '</div>';

      html += '<button onclick="addStickersToGroup(\'' + g.id + '\')" style="padding:8px 14px;border:1px dashed var(--border);border-radius:10px;background:transparent;color:var(--blue);font-size:13px;cursor:pointer;">+ 添加表情包（最多 20 个）</button>';
      html += '<input type="file" id="stickerFileInput_' + g.id + '" accept="image/*" multiple style="display:none" onchange="handleStickerGroupUpload(event,\'' + g.id + '\')">';
    }

    html += '</div>';
  });

  if (stickerGroups.length === 0) {
    html = '<div style="text-align:center;color:var(--gray);padding:40px;">还没有分组，点右上角 + 新建</div>';
  }

  container.innerHTML = html;
}

function toggleStickerGroupCollapse(groupId) {
  var g = stickerGroups.find(function(x) { return x.id === groupId; });
  if (!g) return;
  g.collapsed = !g.collapsed;
  saveStickerGroups();
  renderStickerGroups();
}

function addStickerGroup() {
  var name = prompt('新分组名称：');
  if (!name || !name.trim()) return;
  var id = 'sg_' + Date.now();
  stickerGroups.push({ id: id, name: name.trim(), items: [] });
  saveStickerGroups();
  renderStickerGroups();
  showToast('分组已添加');
}

function renameStickerGroup(groupId) {
  var g = stickerGroups.find(function(x) { return x.id === groupId; });
  if (!g) return;
  var name = prompt('修改分组名称：', g.name);
  if (name === null) return;
  if (!name.trim()) return;
  g.name = name.trim();
  saveStickerGroups();
  renderStickerGroups();
  showToast('已修改');
}

function moveStickerGroup(groupId, dir) {
  var idx = stickerGroups.findIndex(function(x) { return x.id === groupId; });
  if (idx < 0) return;
  var target = idx + dir;
  if (target < 0 || target >= stickerGroups.length) return;
  var tmp = stickerGroups[idx];
  stickerGroups[idx] = stickerGroups[target];
  stickerGroups[target] = tmp;
  saveStickerGroups();
  renderStickerGroups();
}

function deleteStickerGroup(groupId) {
  var g = stickerGroups.find(function(x) { return x.id === groupId; });
  if (!g) return;
  if (!confirm('确定删除「' + g.name + '」分组吗？\n\n组内 ' + (g.items || []).length + ' 个表情包会一起删除，不可恢复！')) return;
  stickerGroups = stickerGroups.filter(function(x) { return x.id !== groupId; });
  if (stickerGroups.length === 0) {
    stickerGroups.push({ id: 'default', name: '默认', items: [] });
  }
  saveStickerGroups();
  renderStickerGroups();
  showToast('分组已删除');
}

function addStickersToGroup(groupId) {
  var input = document.getElementById('stickerFileInput_' + groupId);
  if (input) input.click();
}

function handleStickerGroupUpload(e, groupId) {
  var files = e.target.files;
  if (!files || files.length === 0) return;
  if (files.length > 20) {
    showToast('一次最多添加 20 个，已自动取前 20 个');
  }
  var totalFiles = Math.min(files.length, 20);
  var g = stickerGroups.find(function(x) { return x.id === groupId; });
  if (!g) return;

  showToast('正在处理 ' + totalFiles + ' 张图片...');

  var promises = [];
  for (var i = 0; i < totalFiles; i++) {
    promises.push(compressSticker(files[i]));
  }

  Promise.all(promises).then(function(results) {
    g.items = (g.items || []).concat(results);
    saveStickerGroups();
    renderStickerGroups();
    showToast('成功添加 ' + results.length + ' 个表情包');
  }).catch(function(err) {
    showToast('添加失败：' + err.message);
  });

  e.target.value = '';
}

function compressSticker(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var MAX_SIZE = 400;
        var width = img.width, height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
       resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = function() { reject(new Error('图片加载失败')); };
      img.src = ev.target.result;
    };
    reader.onerror = function() { reject(new Error('读取失败')); };
    reader.readAsDataURL(file);
  });
}

function deleteStickerFromGroup(groupId, itemIdx) {
  var g = stickerGroups.find(function(x) { return x.id === groupId; });
  if (!g) return;
  g.items.splice(itemIdx, 1);
  saveStickerGroups();
  renderStickerGroups();
  showToast('已删除');
}

// ===== 红包基础函数 =====
function getDreamBalance(dreamId) {
  var d = state.dreams.find(function(x) { return x.id === dreamId; });
  return d && d.balance != null ? d.balance : 0;
}

function setDreamBalance(dreamId, amount) {
  var d = state.dreams.find(function(x) { return x.id === dreamId; });
  if (!d) return;
  var n = parseFloat(amount) || 0;
  if (n < 0) n = 0;
  if (n > 99999999) n = 99999999;
  d.balance = Math.floor(n * 100) / 100;
  saveState();
}

function addDreamBalance(dreamId, amount) {
  var cur = getDreamBalance(dreamId);
  setDreamBalance(dreamId, cur + (parseFloat(amount) || 0));
}

// 微信风格随机分配：把 total 分成 count 份，总和严格等于 total
function randomSplit(total, count) {
  if (count <= 0) return [];
  if (count === 1) return [Math.floor(total * 100) / 100];
  var remainCents = Math.round(total * 100);
  var result = [];
  for (var i = 0; i < count - 1; i++) {
    var slotsLeft = count - i;
    var avg = remainCents / slotsLeft;
    var maxCents = Math.floor(avg * 2);
    var minCents = 1;
    if (maxCents < minCents) maxCents = minCents;
    var pickCents = minCents + Math.floor(Math.random() * (maxCents - minCents + 1));
    if (pickCents > remainCents - (slotsLeft - 1) * 1) {
      pickCents = remainCents - (slotsLeft - 1) * 1;
    }
    if (pickCents < 1) pickCents = 1;
    result.push(pickCents / 100);
    remainCents -= pickCents;
  }
  result.push(remainCents / 100);
  return result;
}

function formatMoney(n) {
  return (parseFloat(n) || 0).toFixed(2);
}

// ===== 红包面板 =====
function openRedPacketPanel() {
  document.getElementById('actionMenuPanel').style.display = 'none';
  var isGroup = state.currentChatId && state.currentChatId.startsWith('group_');
  var balanceSection = document.getElementById('rpBalanceSection');
  var peopleRow = document.getElementById('rpPeopleRow');

  if (isGroup) {
    balanceSection.style.display = 'none';
    peopleRow.style.display = 'block';
    var g = state.groups.find(function(x) { return x.id === state.currentChatId; });
    var maxPeople = g ? g.memberIds.length + 1 : 1;
    document.getElementById('rpPeople').max = maxPeople;
    document.getElementById('rpPeople').placeholder = '1 ~ ' + maxPeople;
  } else {
    balanceSection.style.display = 'block';
    peopleRow.style.display = 'none';
    document.getElementById('rpBalanceNum').textContent = formatMoney(getDreamBalance(state.currentChatId));
  }

  document.getElementById('rpAmount').value = '';
  document.getElementById('rpMessage').value = '';
  document.getElementById('redPacketPanel').style.display = 'flex';
}

function closeRedPacketPanel() {
  document.getElementById('redPacketPanel').style.display = 'none';
}

function openTopupDialog() {
  if (!state.currentChatId || state.currentChatId.startsWith('group_')) return;
  var dreamId = state.currentChatId;
  var v = prompt('给「' + getDreamName(dreamId) + '」充值（最多 99999999）：', '100');
  if (v === null) return;
  var n = parseFloat(v);
  if (isNaN(n) || n <= 0) { showToast('请输入有效金额'); return; }
  if (n > 99999999) n = 99999999;
  n = Math.floor(n * 100) / 100;

  var remaining = n;

  // 【新增】优先还债
  if (state.workShifts && state.workShifts.length > 0) {
    var debtWorks = state.workShifts.filter(function(w) {
      return w.dreamId === dreamId && w.debt > 0;
    });
    debtWorks.forEach(function(w) {
      if (remaining <= 0) return;
      var pay = Math.min(remaining, w.debt);
      pay = Math.round(pay * 100) / 100;
      w.debt = Math.round((w.debt - pay) * 100) / 100;
      remaining = Math.round((remaining - pay) * 100) / 100;
      w.todayLog.push({
        hour: new Date().getHours(),
        min: new Date().getMinutes(),
        text: '用充值还债 ' + pay.toFixed(2) + ' 元' + (w.debt > 0 ? '（剩欠债 ' + w.debt.toFixed(2) + ' 元）' : '（已还清）'),
        type: 'repay'
      });
    });
  }

  // 还完剩下的进金库
  if (remaining > 0) {
    addDreamBalance(dreamId, remaining);
  }

  saveState();
  document.getElementById('rpBalanceNum').textContent = formatMoney(getDreamBalance(dreamId));
  renderWorkCards();

  if (remaining < n) {
    showToast('充值 ' + formatMoney(n) + '，其中 ' + formatMoney(n - remaining) + ' 用于还债');
  } else {
    showToast('已充值 ' + formatMoney(n));
  }
}

function sendRedPacket() {
  var amount = parseFloat(document.getElementById('rpAmount').value);
  if (isNaN(amount) || amount <= 0) { showToast('请输入有效金额'); return; }
  if (amount > 99999999) amount = 99999999;
  amount = Math.floor(amount * 100) / 100;

  var msg = (document.getElementById('rpMessage').value || '').trim() || '大吉大利，恭喜发财';
  var isGroup = state.currentChatId && state.currentChatId.startsWith('group_');
  var maxPeople = 1;
  var isGroup = state.currentChatId && state.currentChatId.startsWith('group_');
  var maxPeople = 1;
  if (isGroup) {
    var g = state.groups.find(function(x) { return x.id === state.currentChatId; });
    var groupLimit = g ? (g.memberIds.length + 1) : 1;
    var people = parseInt(document.getElementById('rpPeople').value) || 1;
    if (people < 1) people = 1;
    if (people > groupLimit) people = groupLimit;
    maxPeople = people;
  } else {
    maxPeople = 1;
  }

  var packet = {
    from: 'user',
    senderId: 'user',
    senderName: state.profile.name || '我',
    type: 'redpacket',
    packetId: 'rp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    totalAmount: amount,
    message: msg,
    maxPeople: isGroup ? maxPeople : 1,
    claimed: [],
    refunded: false,
    chatId: state.currentChatId,
    time: Date.now()
  };

  if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
  state.chatSessions[state.currentChatId].push(packet);
  saveState();
  loadChatMessages();
  renderChatMessages();
  closeRedPacketPanel();

  if (!isGroup && state.currentChatId) {
    var dreamId = state.currentChatId;
    setTimeout(function() {
      if (Math.random() < 0.85) {
        claimRedPacket(packet.packetId, dreamId);
      } else {
       refundRedPacket(packet.packetId, dreamId, '梦角退回') ;
      }
    }, 2000 + Math.random() * 3000);
  } else if (isGroup) {
    var g2 = state.groups.find(function(x) { return x.id === state.currentChatId; });
    if (g2) {
      g2.memberIds.forEach(function(id) {
        if (Math.random() < 0.65) {
          setTimeout(function() {
            claimRedPacket(packet.packetId, id);
          }, 1500 + Math.random() * 6000);
        }
      });
    }
  }
}

function claimRedPacket(packetId, claimerId) {
  if (!state.chatSessions) return;
  for (var chatId in state.chatSessions) {
    var msgs = state.chatSessions[chatId];
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (m && m.type === 'redpacket' && m.packetId === packetId) {
        if (m.refunded) return;
        if (m.claimed.length >= m.maxPeople) return;
        if (m.claimed.some(function(c) { return c.userId === claimerId; })) return;

        var remain = m.totalAmount - m.claimed.reduce(function(s, c) { return s + c.amount; }, 0);
        remain = Math.round(remain * 100) / 100;
        var slots = m.maxPeople - m.claimed.length;
        var splits = randomSplit(remain, slots);
        var got = splits[0];
        if (got < 0.01) got = 0.01;
        if (got > remain) got = remain;
        got = Math.round(got * 100) / 100;

        m.claimed.push({
          userId: claimerId,
          name: claimerId === 'user' ? (state.profile.name || '我') : getDreamName(claimerId),
          amount: got,
          time: Date.now()
        });

        // 【新增】：梦角领到的钱，优先还债
        if (claimerId !== 'user') {
          var remaining = got;
          // 找出这个梦角所有欠债的打工记录
          if (state.workShifts && state.workShifts.length > 0) {
            var debtWorks = state.workShifts.filter(function(w) {
              return w.dreamId === claimerId && w.debt > 0;
            });
            debtWorks.forEach(function(w) {
              if (remaining <= 0) return;
              var pay = Math.min(remaining, w.debt);
              pay = Math.round(pay * 100) / 100;
              w.debt = Math.round((w.debt - pay) * 100) / 100;
              remaining = Math.round((remaining - pay) * 100) / 100;
              // 在打工记录里也留一条
              w.todayLog.push({
                hour: new Date().getHours(),
                min: new Date().getMinutes(),
                text: '用红包还债 ' + pay.toFixed(2) + ' 元' + (w.debt > 0 ? '（剩欠债 ' + w.debt.toFixed(2) + ' 元）' : '（已还清）'),
                type: 'repay'
              });
            });
          }
          // 还完债剩下的才进金库
          if (remaining > 0) {
            addDreamBalance(claimerId, remaining);
          }
          saveState();
          renderWorkCards();
        }

        var claimName = claimerId === 'user' ? (state.profile.name || '我') : getDreamName(claimerId);
        state.chatSessions[chatId].push({ from: 'system', text: '「' + claimName + '」领取了红包', time: Date.now() });

        saveState();
        if (state.currentChatId === chatId) {
          loadChatMessages();
          renderChatMessages();
        }
        return;
      }
    }
  }
}

function refundRedPacket(packetId, rejecterId, reason) {
  if (!state.chatSessions) return;
  for (var chatId in state.chatSessions) {
    var msgs = state.chatSessions[chatId];
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (m && m.type === 'redpacket' && m.packetId === packetId) {
        if (m.refunded) return;
        var remain = m.totalAmount - m.claimed.reduce(function(s, c) { return s + c.amount; }, 0);
        remain = Math.max(0, Math.round(remain * 100) / 100);
        if (m.from === 'dream' && m.senderId) {
          addDreamBalance(m.senderId, remain);
        }
        m.refunded = true;
        m.refundReason = reason || '已退回';
        var rejName = rejecterId === 'user' ? (state.profile.name || '我') : getDreamName(rejecterId);
        state.chatSessions[chatId].push({ from: 'system', text: '「' + rejName + '」退回了红包', time: Date.now() });
        saveState();
        if (state.currentChatId === chatId) {
          loadChatMessages();
          renderChatMessages();
        }
        return;
      }
    }
  }
}

function openRedPacketDetail(packetId) {
  if (!state.chatSessions) return;
  for (var chatId in state.chatSessions) {
    var msgs = state.chatSessions[chatId];
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (m && m.type === 'redpacket' && m.packetId === packetId) {
        document.getElementById('rpdSender').textContent = '来自 ' + m.senderName + ' 的红包';
        document.getElementById('rpdAmount').textContent = formatMoney(m.totalAmount);
        document.getElementById('rpdMessage').textContent = m.message;

        var list = document.getElementById('rpdClaimList');
        var html = '';

        // 判断：是不是梦角发的，且用户还没领，且没退回 → 显示领取/退回按钮
        var fromDream = (m.from === 'dream');
        var userClaimed = m.claimed.some(function(c) { return c.userId === 'user'; });
                var isGroupChat = chatId && chatId.startsWith('group_');
        var needUserAction = !userClaimed && !m.refunded && m.claimed.length < m.maxPeople &&
          ((m.from === 'dream') || (m.from === 'user' && isGroupChat));

        if (needUserAction) {
          html += '<div style="display:flex;gap:10px;margin-bottom:14px;">';
          html += '<button onclick="userClaimRedPacket(\'' + m.packetId + '\')" style="flex:1;padding:11px;border:none;border-radius:12px;background:#fa5151;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">领取</button>';
          html += '<button onclick="userRejectRedPacket(\'' + m.packetId + '\')" style="flex:1;padding:11px;border:1px solid #e5e5ea;background:transparent;border-radius:12px;font-size:14px;cursor:pointer;color:#1d1d1f;">退回</button>';
          html += '</div>';
        }

        if (m.claimed.length === 0) {
          html += '<div style="text-align:center;color:#86868b;font-size:13px;padding:20px 0;">暂无人领取</div>';
        } else {
          var sorted = m.claimed.slice().sort(function(a, b) { return b.amount - a.amount; });
          html += '<div style="font-size:12px;color:#86868b;margin-bottom:10px;">已领取 ' + m.claimed.length + '/' + m.maxPeople + ' 个</div>';
          sorted.forEach(function(c, idx) {
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f5;">';
            html += '<span style="font-size:14px;color:#1d1d1f;">' + (idx === 0 ? '👑 ' : '') + c.name + '</span>';
            html += '<span style="font-size:14px;font-weight:600;color:#fa5151;">' + formatMoney(c.amount) + '</span>';
            html += '</div>';
          });
          if (m.refunded) {
            html += '<div style="margin-top:10px;text-align:center;font-size:12px;color:#86868b;">已退回（' + (m.refundReason || '') + '）</div>';
          }
        }
        list.innerHTML = html;
        document.getElementById('redPacketDetail').style.display = 'flex';
        return;
      }
    }
  }
}

// 用户领取梦角发的红包
function userClaimRedPacket(packetId) {
  if (!state.chatSessions) return;
  for (var chatId in state.chatSessions) {
    var msgs = state.chatSessions[chatId];
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (m && m.type === 'redpacket' && m.packetId === packetId) {
        if (m.refunded) { showToast('红包已退回'); return; }
        if (m.claimed.length >= m.maxPeople) { showToast('红包已被领完'); return; }
        if (m.claimed.some(function(c) { return c.userId === 'user'; })) { showToast('你已经领过了'); return; }
        if (m.from === 'user' && !chatId.startsWith('group_')) { showToast('私聊里不能领自己发的红包'); return; }

        var remain = m.totalAmount - m.claimed.reduce(function(s, c) { return s + c.amount; }, 0);
        remain = Math.round(remain * 100) / 100;
        var slots = m.maxPeople - m.claimed.length;
        var splits = randomSplit(remain, slots);
        var got = splits[0];
        if (got < 0.01) got = 0.01;
        if (got > remain) got = remain;

        m.claimed.push({
          userId: 'user',
          name: state.profile.name || '我',
          amount: Math.round(got * 100) / 100,
          time: Date.now()
        });

        state.chatSessions[chatId].push({ from: 'system', text: '「' + (state.profile.name || '我') + '」领取了红包', time: Date.now() });
        saveState();
        closeRedPacketDetail();
        if (state.currentChatId === chatId) {
          loadChatMessages();
          renderChatMessages();
        }
        showToast('已领取 ' + formatMoney(got));
        return;
      }
    }
  }
}

// 用户退回梦角发的红包
function userRejectRedPacket(packetId) {
  if (!confirm('确定退回这个红包吗？')) return;
  refundRedPacket(packetId, 'user', '用户退回');
  closeRedPacketDetail();
}

function closeRedPacketDetail() {
  document.getElementById('redPacketDetail').style.display = 'none';
}

// ===== 红包 24 小时超时退回 =====
function checkRedPacketExpiry() {
  if (!state.chatSessions) return;
  var now = Date.now();
  var EXPIRE_MS = 24 * 60 * 60 * 1000; // 24 小时
  var changed = false;

  for (var chatId in state.chatSessions) {
    var msgs = state.chatSessions[chatId];
    if (!Array.isArray(msgs)) continue;
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (!m || m.type !== 'redpacket') continue;
      if (m.refunded) continue;                                // 已退回
      if (now - m.time < EXPIRE_MS) continue;                  // 还没到 24 小时
      if (m.claimed.length >= m.maxPeople) continue;           // 已领完

      var remain = m.totalAmount - m.claimed.reduce(function(s, c) { return s + c.amount; }, 0);
      remain = Math.max(0, Math.round(remain * 100) / 100);

      // 如果是梦角发的，剩余金额退回梦角金库
      if (m.from === 'dream' && m.senderId && remain > 0) {
        addDreamBalance(m.senderId, remain);
      }

      m.refunded = true;
      m.refundReason = '超时未领完';
      m.refundAt = now;

      msgs.push({
        from: 'system',
        text: '红包超时未领完，剩余 ' + formatMoney(remain) + ' 已退回给「' + m.senderName + '」',
        time: now
      });
      changed = true;
    }
  }

  if (changed) {
    saveState();
    if (state.currentChatId) {
      loadChatMessages();
      renderChatMessages();
    }
  }
}

// ===== 送礼模块 · 数据层 =====
var DEFAULT_GIFTS = [
  { id: 'gift_1', name: '蛋糕', price: 5 },
  { id: 'gift_2', name: '花',   price: 10 },
  { id: 'gift_3', name: '奶茶', price: 15 }
];

function getGiftItems() {
  if (!state.giftItems || !Array.isArray(state.giftItems) || state.giftItems.length === 0) {
      if (!state.workShifts || !Array.isArray(state.workShifts)) {
      if (!state.bannedDreams || !Array.isArray(state.bannedDreams)) state.bannedDreams = [];
  if (!state.apologizingDreams || !Array.isArray(state.apologizingDreams)) state.apologizingDreams = [];
  if (!state.cheatUsage || typeof state.cheatUsage !== 'object') {
      if (!state.musicLibrary || typeof state.musicLibrary !== 'object') {
    state.musicLibrary = { songs: [], playlists: [] };
  }
    state.cheatUsage = { date: '', unbanGroups: [], seizeGroups: [] };
  }
    state.workShifts = [];
  }
      if (!state.workShifts || !Array.isArray(state.workShifts)) {
    state.workShifts = [];
  }
    state.giftItems = JSON.parse(JSON.stringify(DEFAULT_GIFTS));
    saveState();
  }
  return state.giftItems;
}

function saveGiftItems() {
  saveState();
}

// ===== 送礼模块 · 面板 =====
var giftEditMode = false;

function openGiftPanel() {
  document.getElementById('actionMenuPanel').style.display = 'none';

  // 只允许私聊
  if (!state.currentChatId || state.currentChatId.startsWith('group_')) {
    showToast('送礼只能在私聊里使用');
    return;
  }

  giftEditMode = false;
  updateGiftEditBtn();
  renderGiftList();
  document.getElementById('giftPanel').style.display = 'flex';
}

function closeGiftPanel() {
  document.getElementById('giftPanel').style.display = 'none';
}

function toggleGiftEditMode() {
  giftEditMode = !giftEditMode;
  updateGiftEditBtn();
  renderGiftList();
}

function updateGiftEditBtn() {
  var btn = document.getElementById('giftEditBtn');
  if (!btn) return;
  btn.textContent = giftEditMode ? '完成' : '编辑';
  btn.style.background = giftEditMode ? '#ff3b30' : '#fff';
  btn.style.color = giftEditMode ? '#fff' : '#007aff';
}

function renderGiftList() {
  var container = document.getElementById('giftListContainer');
  if (!container) return;
  var items = getGiftItems();

  var html = '';

  if (giftEditMode) {
    // 编辑模式：可以改名、改价、删除，底部加「+ 添加礼品」
    items.forEach(function(g, idx) {
      html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f0f0f5;">';
      html += '<input type="text" value="' + (g.name || '').replace(/"/g, '&quot;') + '" onchange="updateGiftName(' + idx + ', this.value)" style="flex:2;padding:6px 10px;border:1px solid #e5e5ea;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box;">';
      html += '<input type="number" value="' + g.price + '" step="0.01" min="0.01" max="99999999" onchange="updateGiftPrice(' + idx + ', this.value)" style="flex:1;padding:6px 10px;border:1px solid #e5e5ea;border-radius:8px;font-size:13px;outline:none;box-sizing:border-box;width:70px;">';
      html += '<span onclick="deleteGiftItem(' + idx + ')" style="color:#ff3b30;cursor:pointer;font-size:16px;padding:0 4px;">×</span>';
      html += '</div>';
    });
    html += '<button onclick="addGiftItem()" style="width:100%;margin-top:10px;padding:9px;border:1px dashed #e5e5ea;background:transparent;border-radius:10px;color:#007aff;font-size:13px;cursor:pointer;">+ 添加礼品</button>';
  } else {
    // 正常模式：点一下选礼品
    if (items.length === 0) {
      html = '<div style="text-align:center;color:#86868b;padding:30px 0;font-size:13px;">还没有礼品，点右上角「编辑」添加</div>';
    } else {
      items.forEach(function(g, idx) {
        html += '<div onclick="sendGiftByIndex(' + idx + ')" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;margin-bottom:8px;background:#f8f8fa;border-radius:12px;cursor:pointer;">';
        html += '<span style="font-size:14px;color:#1d1d1f;">' + g.name + '</span>';
        html += '<span style="font-size:13px;color:#fa5151;font-weight:600;">' + formatMoney(g.price) + ' 元</span>';
        html += '</div>';
      });
    }
  }

  container.innerHTML = html;
}

function addGiftItem() {
  var items = getGiftItems();
  items.push({ id: 'gift_' + Date.now(), name: '新礼品', price: 1 });
  saveGiftItems();
  renderGiftList();
}

function updateGiftName(idx, val) {
  var items = getGiftItems();
  if (idx < 0 || idx >= items.length) return;
  items[idx].name = (val || '').trim() || '未命名';
  saveGiftItems();
}

function updateGiftPrice(idx, val) {
  var items = getGiftItems();
  if (idx < 0 || idx >= items.length) return;
  var n = parseFloat(val) || 0;
  if (n < 0.01) n = 0.01;
  if (n > 99999999) n = 99999999;
  items[idx].price = Math.floor(n * 100) / 100;
  saveGiftItems();
}

function deleteGiftItem(idx) {
  var items = getGiftItems();
  if (idx < 0 || idx >= items.length) return;
  items.splice(idx, 1);
  saveGiftItems();
  renderGiftList();
}

// ===== 送礼模块 · 发送逻辑 =====
function sendGiftByIndex(idx) {
  var items = getGiftItems();
  if (idx < 0 || idx >= items.length) return;
  var gift = items[idx];

  var countStr = prompt('送几份「' + gift.name + '」？', '1');
  if (countStr === null) return;
  var count = parseInt(countStr) || 0;
  if (count < 1) { showToast('请输入有效份数'); return; }

  var totalPrice = Math.floor(gift.price * count * 100) / 100;

  var packet = {
    from: 'user',
    senderId: 'user',
    senderName: state.profile.name || '我',
    type: 'gift',
    packetId: 'gf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    giftName: gift.name,
    unitPrice: gift.price,
    count: count,
    totalPrice: totalPrice,
    claimed: [],
    refunded: false,
    chatId: state.currentChatId,
    time: Date.now()
  };

  if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
  state.chatSessions[state.currentChatId].push(packet);
  saveState();
  loadChatMessages();
  renderChatMessages();
  closeGiftPanel();

  // 梦角决定领不领
  var dreamId = state.currentChatId;
  setTimeout(function() {
    if (Math.random() < 0.8) {
      // 领取
      state.chatSessions[dreamId].push({ from: 'system', text: '「' + getDreamName(dreamId) + '」领取了礼物', time: Date.now() });
      packet.claimed.push({ userId: dreamId, name: getDreamName(dreamId), time: Date.now() });
      saveState();
    } else {
      // 拒绝
      packet.refunded = true;
      packet.refundReason = '梦角拒绝';
      state.chatSessions[dreamId].push({ from: 'system', text: '「' + getDreamName(dreamId) + '」拒绝了礼物', time: Date.now() });
      saveState();
    }
    if (state.currentChatId === dreamId) {
      loadChatMessages();
      renderChatMessages();
    }
  }, 2000 + Math.random() * 3000);
}

function openGiftDetail(packetId) {
  if (!state.chatSessions) return;
  for (var chatId in state.chatSessions) {
    var msgs = state.chatSessions[chatId];
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (m && m.type === 'gift' && m.packetId === packetId) {
        document.getElementById('gdSender').textContent = '来自 ' + m.senderName + ' 的礼物';
        document.getElementById('gdName').textContent = m.giftName + ' ×' + m.count;
        document.getElementById('gdPrice').textContent = formatMoney(m.totalPrice) + ' 元';

        var actionArea = document.getElementById('gdActionArea');
        var html = '';

        var fromDream = (m.from === 'dream');
        var userClaimed = m.claimed.some(function(c) { return c.userId === 'user'; });
        var needUserAction = fromDream && !userClaimed && !m.refunded;

        if (needUserAction) {
          html += '<div style="display:flex;gap:10px;margin-bottom:14px;">';
          html += '<button onclick="userClaimGift(\'' + m.packetId + '\')" style="flex:1;padding:11px;border:none;border-radius:12px;background:#fa5151;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">领取</button>';
          html += '<button onclick="userRejectGift(\'' + m.packetId + '\')" style="flex:1;padding:11px;border:1px solid #e5e5ea;background:transparent;border-radius:12px;font-size:14px;cursor:pointer;color:#1d1d1f;">拒绝</button>';
          html += '</div>';
        }

        if (m.claimed.length === 0) {
          html += '<div style="text-align:center;color:#86868b;font-size:13px;padding:10px 0;">暂无人领取</div>';
        } else {
          html += '<div style="font-size:12px;color:#86868b;margin-bottom:8px;">已领取</div>';
          m.claimed.forEach(function(c) {
            html += '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#1d1d1f;">';
            html += '<span>' + c.name + '</span>';
            html += '<span style="color:#fa5151;font-weight:600;">' + formatMoney(m.totalPrice) + ' 元</span>';
            html += '</div>';
          });
        }
        if (m.refunded) {
          html += '<div style="margin-top:10px;text-align:center;font-size:12px;color:#86868b;">已退回（' + (m.refundReason || '') + '）</div>';
        }

        actionArea.innerHTML = html;
        document.getElementById('giftDetail').style.display = 'flex';
        return;
      }
    }
  }
}

function closeGiftDetail() {
  document.getElementById('giftDetail').style.display = 'none';
}

function userClaimGift(packetId) {
  if (!state.chatSessions) return;
  for (var chatId in state.chatSessions) {
    var msgs = state.chatSessions[chatId];
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (m && m.type === 'gift' && m.packetId === packetId) {
        if (m.refunded) { showToast('礼物已退回'); return; }
        if (m.claimed.some(function(c) { return c.userId === 'user'; })) { showToast('你已经领取了'); return; }

        m.claimed.push({ userId: 'user', name: state.profile.name || '我', time: Date.now() });
        state.chatSessions[chatId].push({ from: 'system', text: '「' + (state.profile.name || '我') + '」领取了礼物', time: Date.now() });
        saveState();
        closeGiftDetail();
        if (state.currentChatId === chatId) {
          loadChatMessages();
          renderChatMessages();
        }
        showToast('已领取');
        return;
      }
    }
  }
}

function userRejectGift(packetId) {
  if (!confirm('确定拒绝这个礼物吗？')) return;
  if (!state.chatSessions) return;
  for (var chatId in state.chatSessions) {
    var msgs = state.chatSessions[chatId];
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (m && m.type === 'gift' && m.packetId === packetId) {
        if (m.refunded) return;
        // 如果是梦角发的，钱退回梦角金库
        if (m.from === 'dream' && m.senderId) {
          addDreamBalance(m.senderId, m.totalPrice);
        }
        m.refunded = true;
        m.refundReason = '用户拒绝';
        state.chatSessions[chatId].push({ from: 'system', text: '「' + (state.profile.name || '我') + '」拒绝了礼物', time: Date.now() });
        saveState();
        closeGiftDetail();
        if (state.currentChatId === chatId) {
          loadChatMessages();
          renderChatMessages();
        }
        showToast('已拒绝');
        return;
      }
    }
  }
}

// ===== 打工系统 · 场景配置 =====
var WORK_SCENES = [
  {
    id: 'cafe',
    name: '咖啡馆',
    hourlyWage: 15,
    shifts: [[8, 11], [14, 17]]
  },
  {
    id: 'library',
    name: '图书馆',
    hourlyWage: 10,
    shifts: [[8, 12], [14, 16]]
  },
  {
    id: 'milktea',
    name: '奶茶店',
    hourlyWage: 10,
    shifts: [[8, 16]]
  },
  {
    id: 'catcafe',
    name: '猫咖馆',
    hourlyWage: 20,
    shifts: [[9, 11], [14, 18]]
  },
  {
    id: 'convenience_day',
    name: '便利店白班',
    hourlyWage: 25,
    shifts: [[6, 12], [14, 17]]
  },
  {
    id: 'convenience_night',
    name: '便利店晚班',
    hourlyWage: 15,
    shifts: [[18, 23]]
  }
];

// 扣钱原因
var WORK_PENALTIES = [
  { reason: '玩手机', amount: 5 },
  { reason: '摸鱼', amount: 3 },
  { reason: '损坏工作器材', amount: 20 },
  { reason: '顶撞老板', amount: 10 },
  { reason: '迟到', amount: 5 }
];

// 奖金原因
var WORK_BONUSES = [
  { reason: '优秀员工', amount: 5, weight: 45 },
  { reason: '效率高效', amount: 3, weight: 45 },
  { reason: '模范员工', amount: 10, weight: 10 }
];

// 按权重随机抽奖金
function pickRandomBonus() {
  var total = WORK_BONUSES.reduce(function(s, b) { return s + b.weight; }, 0);
  var r = Math.random() * total;
  for (var i = 0; i < WORK_BONUSES.length; i++) {
    if (r < WORK_BONUSES[i].weight) return WORK_BONUSES[i];
    r -= WORK_BONUSES[i].weight;
  }
  return WORK_BONUSES[0];
}

// 按 id 找场景
function getWorkScene(sceneId) {
  return WORK_SCENES.find(function(s) { return s.id === sceneId; });
}

// 计算某个场景今天的总工时（小时）
function getSceneDailyHours(scene) {
  if (!scene) return 0;
  var total = 0;
  scene.shifts.forEach(function(s) { total += (s[1] - s[0]); });
  return total;
}

// 判断某个场景在某个时刻是否处于工作时段
function isSceneWorkingAt(scene, date) {
  if (!scene) return false;
  var h = date.getHours();
  for (var i = 0; i < scene.shifts.length; i++) {
    if (h >= scene.shifts[i][0] && h < scene.shifts[i][1]) return true;
  }
  return false;
}

// 格式化时间：8 → "08:00"
function fmtHour(h, m) {
  var hh = String(h).padStart(2, '0');
  var mm = String(m || 0).padStart(2, '0');
  return hh + ':' + mm;
}

// ===== 打工系统 · 面板 =====
var workSelectedSceneId = null;

function openWorkPicker() {
  // 填充梦角下拉
  var sel = document.getElementById('workDreamSelect');
  var idleDreams = state.dreams.filter(function(d) {
    return !state.workShifts.some(function(w) { return w.dreamId === d.id && w.active; });
  });
  if (idleDreams.length === 0) {
    showToast('所有梦角都在打工中，没有空闲的');
    return;
  }
  sel.innerHTML = idleDreams.map(function(d) {
    return '<option value="' + d.id + '">' + d.name + '</option>';
  }).join('');

  // 渲染场景列表
  workSelectedSceneId = WORK_SCENES[0].id;
  renderWorkSceneList();
  document.getElementById('workPickerModal').style.display = 'flex';
}

function renderWorkSceneList() {
  var list = document.getElementById('workSceneList');
  list.innerHTML = WORK_SCENES.map(function(s) {
    var active = s.id === workSelectedSceneId;
    var hours = getSceneDailyHours(s);
    var dailyPay = (hours * s.hourlyWage).toFixed(0);
    return '<div onclick="pickWorkScene(\'' + s.id + '\')" style="padding:10px 12px;border-radius:12px;margin-bottom:8px;cursor:pointer;border:2px solid ' + (active ? '#007aff' : '#f0f0f5') + ';background:' + (active ? 'rgba(0,122,255,0.06)' : '#f8f8fa') + ';">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;">'
      + '<span style="font-size:14px;font-weight:600;color:#1d1d1f;">' + s.name + '</span>'
      + '<span style="font-size:13px;color:#fa5151;font-weight:600;">' + s.hourlyWage + ' 元/时</span>'
      + '</div>'
      + '<div style="font-size:11px;color:#86868b;margin-top:4px;">工时 ' + hours + ' 小时 · 日薪 ' + dailyPay + ' 元</div>'
      + '<div style="font-size:11px;color:#86868b;margin-top:2px;">' + s.shifts.map(function(p) { return fmtHour(p[0]) + '-' + fmtHour(p[1]); }).join('、') + '</div>'
      + '</div>';
  }).join('');
}

function pickWorkScene(id) {
  workSelectedSceneId = id;
  renderWorkSceneList();
}

function closeWorkPicker() {
  document.getElementById('workPickerModal').style.display = 'none';
}

function confirmWorkPicker() {
  var dreamId = document.getElementById('workDreamSelect').value;
  if (!dreamId) return;
  var sceneId = workSelectedSceneId;
  if (!sceneId) { showToast('请选择工作'); return; }

  var dream = state.dreams.find(function(d) { return d.id === dreamId; });
  var scene = getWorkScene(sceneId);
  if (!dream || !scene) return;

  // 建议打工：90% 接受
  var accept = Math.random() < 0.90;
  closeWorkPicker();

  if (!accept) {
    showToast('「' + dream.name + '」拒绝了去' + scene.name + '打工');
    return;
  }

  // 创建打工记录
  var today = new Date();
  var todayStr = today.toISOString().slice(0, 10);
  var record = {
    id: 'ws_' + Date.now(),
    dreamId: dreamId,
    dreamName: dream.name,
    sceneId: sceneId,
    sceneName: scene.name,
    hourlyWage: scene.hourlyWage,
    mood: 100,              // 心情值
    active: true,           // 是否还在打工（辞职后变 false）
    startedDate: todayStr,  // 开始打工的日期
    createdAt: Date.now(),
    todayLog: [],           // 今天的事件记录
    todayEarnings: 0,       // 今天累计（奖金-扣钱）
    debt: 0,                // 欠债
    todayDate: '',          // 当前记录归属的日期
    isWorking: false,       // 当前是否在工作时段内
    lastEventCheck: 0,      // 上次事件检测时间戳
    hasLateToday: false,    // 今天是否已迟到
    hasLeaveToday: false    // 今天是否请假
  };

  // 初始心情值：60%~100%
  record.mood = 40 + Math.floor(Math.random() * 61);
  record.todayDate = todayStr;
  record.lastEventCheck = Date.now();
    record.lastSettledDate = '';
  record.todaySettledAmount = null;

  // 判断今天是否请假（5%）
  if (Math.random() < 0.05) {
    record.hasLeaveToday = true;
    record.todayLog.push({ hour: 0, min: 0, text: '今日请假', type: 'leave' });
  }
  // 判断今天是否迟到（10%）
  else if (Math.random() < 0.10) {
    record.hasLateToday = true;
  }

  state.workShifts.push(record);
  saveState();
  renderWorkCards();
  showToast('「' + dream.name + '」接受了，明天开始去' + scene.name + '打工');
}

function renderWorkCards() {
  var container = document.getElementById('workCardsContainer');
  if (!container) return;

  if (!state.workShifts || state.workShifts.length === 0) {
    container.innerHTML = '<div style="padding:60px 20px;text-align:center;color:#86868b;font-size:14px;">还没有梦角在打工<br>点右上角 + 建议梦角去打工吧</div>';
    return;
  }

  var html = '';
  state.workShifts.forEach(function(w) {
    var moodColor = w.mood >= 70 ? '#34c759' : (w.mood >= 30 ? '#ff9500' : '#ff3b30');
    var statusText;
    if (!w.active) statusText = '已辞职';
    else if (w.hasLeaveToday) statusText = '今日请假';
    else if (w.isWorking) statusText = '正在工作';
    else statusText = '已下班';

    html += '<div style="background:rgba(240,240,245,0.75);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:14px;padding:14px 16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);border:1px solid rgba(255,255,255,0.7);">';

    html += '<div onclick="toggleWorkHistory(\'' + w.id + '\')" style="display:flex;justify-content:space-between;align-items:flex-start;cursor:pointer;">';
    html += '<div>';
    html += '<div style="font-size:15px;font-weight:600;color:#1d1d1f;">' + w.dreamName + '</div>';
    if (w.debt > 0) {
      html += '<div style="font-size:11px;color:#ff3b30;margin-top:2px;">欠债 ' + formatMoney(w.debt) + ' 元</div>';
    }
    html += '</div>';
    html += '<div style="font-size:12px;color:#86868b;text-align:right;">';
    html += '<div>心情值：<span style="color:' + moodColor + ';font-weight:600;">' + w.mood + '%</span></div>';
    html += '<div style="margin-top:2px;">' + w.sceneName + ' · ' + statusText + '</div>';
    html += '</div>';
    html += '</div>';

    if (!w.active) {
      html += '<button onclick="event.stopPropagation();deleteWorkCard(\'' + w.id + '\')" style="margin-top:10px;width:100%;padding:8px;border:1px solid #ff3b30;background:transparent;color:#ff3b30;border-radius:10px;font-size:13px;cursor:pointer;">删除卡片</button>';
    }

    html += '<div class="work-history" id="wh_' + w.id + '" style="display:none;margin-top:12px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.06);">';

    var todayTotal = 0;
    if (w.todaySettledAmount != null) {
      todayTotal = w.todaySettledAmount;
    } else if (w.hasLeaveToday) {
      todayTotal = 0;
    } else {
      todayTotal = w.todayEarnings || 0;
    }
    var todayTotalText;
    var todayTotalColor;
    if (todayTotal > 0) { todayTotalText = '+' + todayTotal.toFixed(2) + ' 元'; todayTotalColor = '#34c759'; }
    else if (todayTotal < 0) { todayTotalText = todayTotal.toFixed(2) + ' 元'; todayTotalColor = '#ff3b30'; }
    else { todayTotalText = '0.00 元'; todayTotalColor = '#86868b'; }

    html += '<div style="font-size:13px;font-weight:600;color:' + todayTotalColor + ';margin-bottom:10px;padding-bottom:8px;border-bottom:1px dashed rgba(0,0,0,0.08);">';
    html += '今日累计：' + todayTotalText;
    if (w.hasLeaveToday) html += ' <span style="font-size:11px;color:#86868b;font-weight:400;">（今日请假）</span>';
    html += '</div>';

    html += '<div style="font-size:12px;color:#86868b;margin-bottom:8px;">今天的工作记录（最上方最新）</div>';
    html += '<div style="max-height:240px;overflow-y:auto;">';
    if (!w.todayLog || w.todayLog.length === 0) {
      html += '<div style="font-size:12px;color:#bbb;text-align:center;padding:10px 0;">今天还没有记录</div>';
    } else {
      var reversed = w.todayLog.slice().reverse();
      reversed.forEach(function(ev) {
        html += '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#555;border-bottom:1px solid rgba(0,0,0,0.03);">';
        html += '<span style="color:#86868b;">' + fmtHour(ev.hour, ev.min) + '</span>';
        html += '<span style="flex:1;text-align:right;margin-left:8px;">' + ev.text + '</span>';
        html += '</div>';
      });
    }
    html += '</div>';
    html += '</div>';

    html += '</div>';
  });
  container.innerHTML = html;
}

function deleteWorkCard(workId) {
  if (!confirm('确定删除这张打工卡片吗？')) return;
  state.workShifts = state.workShifts.filter(function(x) { return x.id !== workId; });
  saveState();
  renderWorkCards();
}

function toggleWorkHistory(workId) {
  var el = document.getElementById('wh_' + workId);
  if (!el) return;
  el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
}

// ===== 打工系统 · 定时运行 =====
var workTickInterval = null;

function startWorkSystem() {
  if (workTickInterval) clearInterval(workTickInterval);
  // 每 1 分钟跑一次
  workTickInterval = setInterval(tickWorkSystem, 60 * 1000);
  // 启动时也立刻跑一次
  tickWorkSystem();
}

function tickWorkSystem() {
  if (!state.workShifts || state.workShifts.length === 0) return;
  var now = new Date();
  var nowTs = now.getTime();
  var todayStr = now.toISOString().slice(0, 10);
  var nowHour = now.getHours();
  var nowMin = now.getMinutes();

  state.workShifts.forEach(function(w) {
    if (!w.active) return;

    var scene = getWorkScene(w.sceneId);
    if (!scene) return;

    // 1. 跨天检测
    if (w.todayDate !== todayStr) {
      // 昨天还没结算 → 先结算昨天的
      if (w.lastSettledDate !== w.todayDate) {
        settleDailyWage(w);
      }
      dailyResetWork(w, todayStr);
    }

    // 请假的话今天就什么都不做
    if (w.hasLeaveToday) return;

    // 2. 判断是否处于工作时段
    var inShift = isSceneWorkingAt(scene, now);

  // 3. 上/下班切换
if (inShift && !w.isWorking) {
  w.isWorking = true;
  
  // 【核心修复】：找出当前时间对应的是今天哪一段班次，而不是死板地取第一段班
  var currentShift = null;
  for (var si = 0; si < scene.shifts.length; si++) {
    var s = scene.shifts[si];
    if (nowHour >= s[0] && nowHour < s[1]) {
      currentShift = s;
      break;
    }
  }
  
  // 如果找到了当前班次，就用当前班次的开始时间补录
  var shiftStartHour = currentShift ? currentShift[0] : nowHour; 
  var isCatchUp = (nowHour > shiftStartHour) || (nowHour === shiftStartHour && nowMin > 0);
  var recordHour = isCatchUp ? shiftStartHour : nowHour;
  var recordMin = isCatchUp ? 0 : nowMin;
  
  var checkinText = isCatchUp 
    ? '开始上班（离线补录，原定 ' + fmtHour(shiftStartHour, 0) + ' 上班）' 
    : '开始上班';

  if (w.hasLateToday && !w.lateLogged) {
    w.lateLogged = true;
    w.todayEarnings -= 5;
    w.todayLog.push({
      hour: nowHour, min: nowMin,
      text: '迟到，' + fmtHour(nowHour, nowMin) + ' 才到',
      type: 'checkin'
    });
    w.todayLog.push({
      hour: nowHour, min: nowMin,
      text: '因「迟到」被扣 5 元',
      type: 'penalty',
      amount: 5
    });
  } else {
    w.todayLog.push({
      hour: recordHour, min: recordMin,
      text: checkinText,
      type: 'checkin'
    });
  }
  saveState();
} else if (!inShift && w.isWorking) {
  // 下班逻辑
  w.isWorking = false;
  w.todayLog.push({
    hour: nowHour, min: nowMin,
    text: '下班休息',
    type: 'checkout'
  });
  saveState();
}

    // 4. 到了最后下班时间，且今天还没结算 → 结算
    var lastEnd = scene.shifts[scene.shifts.length - 1][1];
    var hasCheckinToday = (w.todayLog || []).some(function(ev) { return ev.type === 'checkin'; });
    if (nowHour >= lastEnd && w.lastSettledDate !== todayStr && hasCheckinToday) {
      settleDailyWage(w);
    }

    // 5. 每 5 分钟检测事件（只在工作时段内）
    if (w.isWorking) {
      if (!w.lastEventCheck) w.lastEventCheck = nowTs;
      if (nowTs - w.lastEventCheck >= 5 * 60 * 1000) {
        w.lastEventCheck = nowTs;
        triggerWorkEvent(w, scene, now);
      }
    } else {
      w.lastEventCheck = nowTs;
    }
  });

  renderWorkCards();
  saveState();
}

function triggerWorkEvent(w, scene, now) {
  var r = Math.random();
  var hour = now.getHours();
  var min = now.getMinutes();
  var mood = w.mood;

  // 心情 ≤ 70% 时，扣钱概率从 2% 升到 7%（原2% + 5%）
  var penaltyRate = (mood <= 70) ? 0.07 : 0.02;
  var bonusRate = 0.03;
  var customerRate = 0.01;
  var fishRate = (mood <= 70) ? 0.15 : 0.05;
  var quitRate = 0.007;
  if (mood <= 15) quitRate = 0.03;
  if (mood === 0) quitRate = 1;

  var cursor = 0;

  // 1. 遇到客人
  cursor += customerRate;
  if (r < cursor) {
    enqueueWorkCustomerEvent(w.id);
    return;
  }

  // 2. 扣钱
  cursor += penaltyRate;
  if (r < cursor) {
    var p = WORK_PENALTIES[Math.floor(Math.random() * WORK_PENALTIES.length)];
    w.todayLog.push({
      hour: hour, min: min,
      text: '因「' + p.reason + '」被扣 ' + p.amount + ' 元',
      type: 'penalty',
      amount: p.amount
    });
    w.todayEarnings -= p.amount;
    var drop = 3 + Math.floor(Math.random() * 13); // 3~15
    w.mood = Math.max(0, w.mood - drop);
    saveState();
    return;
  }

  // 3. 奖金
  cursor += bonusRate;
  if (r < cursor) {
    var b = pickRandomBonus();
    w.todayLog.push({
      hour: hour, min: min,
      text: '获得「' + b.reason + '」奖金 ' + b.amount + ' 元',
      type: 'bonus',
      amount: b.amount
    });
    w.todayEarnings += b.amount;
    var up = 3 + Math.floor(Math.random() * 13); // 3~15
    w.mood = Math.min(100, w.mood + up);
    saveState();
    return;
  }

  // 4. 摸鱼
  cursor += fishRate;
  if (r < cursor) {
    w.todayLog.push({
      hour: hour, min: min,
      text: '偷偷摸了一会鱼',
      type: 'fish'
    });
    // 摸鱼被发现 3%
    if (Math.random() < 0.03) {
      var fmin = min + 1;
      var fhour = hour;
      if (fmin >= 60) { fmin -= 60; fhour += 1; }
      w.todayLog.push({
        hour: fhour, min: fmin,
        text: '摸鱼被老板发现，被扣 3 元',
        type: 'penalty',
        amount: 3
      });
      w.todayEarnings -= 3;
    }
    saveState();
    return;
  }

  // 5. 辞职
  cursor += quitRate;
  if (r < cursor) {
    w.active = false;
    w.isWorking = false;
    w.todayLog.push({
      hour: hour, min: min,
      text: '辞职了',
      type: 'quit'
    });
    saveState();
    renderWorkCards();
    return;
  }
}

// ===== 打工系统 · 遇到客人弹窗 =====
var workCustomerQueue = [];       // 排队
var workCustomerCurrent = null;   // 当前正在弹的 { workId }

function enqueueWorkCustomerEvent(workId) {
  workCustomerQueue.push(workId);
  tryShowNextCustomerEvent();
}

function tryShowNextCustomerEvent() {
  if (workCustomerCurrent) return; // 已经在弹了
  if (workCustomerQueue.length === 0) return;

  var workId = workCustomerQueue.shift();
  var w = state.workShifts.find(function(x) { return x.id === workId; });
  if (!w || !w.active) {
    // 记录已失效，直接下一个
    setTimeout(tryShowNextCustomerEvent, 100);
    return;
  }

  workCustomerCurrent = { workId: workId };

  document.getElementById('wcTitle').textContent = '⚠️ 遇到麻烦了';
  document.getElementById('wcBody').textContent = '「' + w.dreamName + '」在工作时遇到了胡搅蛮缠的客人，请求你的帮助';
  document.getElementById('wcBody').style.display = 'block';
  document.getElementById('wcSpin').style.display = 'none';
  document.getElementById('wcBtns').style.display = 'flex';
  document.getElementById('wcConfirm').style.display = 'none';
  document.getElementById('workCustomerModal').style.display = 'flex';
}

function workCustomerIgnore() {
  if (!workCustomerCurrent) return;
  var w = state.workShifts.find(function(x) { return x.id === workCustomerCurrent.workId; });
  if (w) {
    var drop = 3 + Math.floor(Math.random() * 13); // 3~15
    w.mood = Math.max(0, w.mood - drop);
    var now = new Date();
    w.todayLog.push({
      hour: now.getHours(), min: now.getMinutes(),
      text: '遇到刁难客人，未处理，心情值 -' + drop + '%',
      type: 'customer_ignore'
    });
    saveState();
    renderWorkCards();
    showToast('「' + w.dreamName + '」心情值 -' + drop + '%');
  }
  closeWorkCustomerModal();
}

function workCustomerHelp() {
  if (!workCustomerCurrent) return;
  var w = state.workShifts.find(function(x) { return x.id === workCustomerCurrent.workId; });
  if (!w) { closeWorkCustomerModal(); return; }

  // 进入转圈状态
  document.getElementById('wcTitle').textContent = '💬 正在争辩';
  document.getElementById('wcBody').style.display = 'none';
  document.getElementById('wcSpin').style.display = 'block';
  document.getElementById('wcBtns').style.display = 'none';

  // 3-8 秒后出结果
  var duration = 3000 + Math.random() * 5000;
  setTimeout(function() {
    var win = Math.random() < 0.6;
    var now = new Date();
    if (win) {
      document.getElementById('wcTitle').textContent = '🎉 赢了';
      document.getElementById('wcBody').textContent = '客人被你怼得哑口无言，离开了' + w.sceneName;
      w.todayLog.push({
        hour: now.getHours(), min: now.getMinutes(),
        text: '帮梦角吵赢了客人',
        type: 'customer_win'
      });
    } else {
      var drop = 3 + Math.floor(Math.random() * 13); // 3~15
      w.mood = Math.max(0, w.mood - drop);
      document.getElementById('wcTitle').textContent = '😞 吵输了';
      document.getElementById('wcBody').innerHTML = '客人再次胡搅蛮缠，争辩失败<br><span style="font-size:12px;color:#ff3b30;">' + w.dreamName + ' 心情值 -' + drop + '%</span>';
      w.todayLog.push({
        hour: now.getHours(), min: now.getMinutes(),
        text: '帮梦角吵架失败，心情值 -' + drop + '%',
        type: 'customer_lose'
      });
    }
    saveState();
    document.getElementById('wcBody').style.display = 'block';
    document.getElementById('wcSpin').style.display = 'none';
    document.getElementById('wcConfirm').style.display = 'block';
    renderWorkCards();
  }, duration);
}

function workCustomerConfirm() {
  closeWorkCustomerModal();
}

function closeWorkCustomerModal() {
  document.getElementById('workCustomerModal').style.display = 'none';
  workCustomerCurrent = null;
  // 处理下一个排队中的事件
  setTimeout(tryShowNextCustomerEvent, 300);
}

// ===== 打工系统 · 每日结算 =====
function settleDailyWage(w) {
  var scene = getWorkScene(w.sceneId);
  if (!scene) return;

  var total;
  if (w.hasLeaveToday) {
    total = 0;
  } else {
    var hours = getSceneDailyHours(scene);
    var baseWage = hours * scene.hourlyWage;
    total = baseWage + (w.todayEarnings || 0);
  }
  total = Math.round(total * 100) / 100;

  var displayText = '';

  // 处理欠债
  if (w.debt > 0 && total > 0) {
    var payDebt = Math.min(total, w.debt);
    w.debt = Math.round((w.debt - payDebt) * 100) / 100;
    total = Math.round((total - payDebt) * 100) / 100;
    displayText = '今日工资 +' + (total + payDebt).toFixed(2) + '，扣欠债 ' + payDebt.toFixed(2) + '，实收 +' + total.toFixed(2);
  } else if (total >= 0) {
    displayText = '今日工资 +' + total.toFixed(2) + ' 元';
  } else {
    displayText = '今日工资 ' + total.toFixed(2) + ' 元';
  }

  // 工资进/扣金库
  if (total > 0) {
    addDreamBalance(w.dreamId, total);
  } else if (total < 0) {
    var balance = getDreamBalance(w.dreamId);
    var need = Math.abs(total);
    if (balance >= need) {
      setDreamBalance(w.dreamId, balance - need);
    } else {
      // 金库不够，剩下的变成欠债
      var remain = need - balance;
      setDreamBalance(w.dreamId, 0);
      w.debt = Math.round((w.debt + remain) * 100) / 100;
      displayText += '（金库不足，欠债 ' + w.debt.toFixed(2) + ' 元）';
    }
  }

  w.todayLog.push({
    hour: new Date().getHours(),
    min: new Date().getMinutes(),
    text: displayText,
    type: 'settle'
  });

  w.todaySettledAmount = total;
  w.lastSettledDate = w.todayDate;
  saveState();
  renderWorkCards();
}

// ===== 打工系统 · 跨天重置 =====
function dailyResetWork(w, todayStr) {
  w.todayDate = todayStr;
  w.todayLog = [];
  w.todayEarnings = 0;
  w.todaySettledAmount = null;
  w.hasLateToday = false;
  w.hasLeaveToday = false;
  w.lateLogged = false;
  w.isWorking = false;
  w.lastEventCheck = Date.now();

  // 心情值刷新到 60%~100%
  w.mood = 40 + Math.floor(Math.random() * 61);

  // 判断今天是否请假（1%）
  if (Math.random() < 0.01) {
    w.hasLeaveToday = true;
    w.todayLog.push({ hour: 0, min: 0, text: '今日请假', type: 'leave' });
  } else if (Math.random() < 0.05) {
    w.hasLateToday = true;
  }
  saveState();
}

// ===== 小助手 · 主面板 =====
function openAssistantPanel() {
  document.getElementById('actionMenuPanel').style.display = 'none';
  document.getElementById('assistantModal').style.display = 'flex';
}

function closeAssistantModal() {
  document.getElementById('assistantModal').style.display = 'none';
}

// ===== 小助手 · 举报顶号 =====
function openReportPanel() {
  closeAssistantModal();
  if (!state.dreams || state.dreams.length < 2) {
    showToast('梦角不足 2 个，无法举报顶号');
    return;
  }
  var topSel = document.getElementById('reportTopSelect');
  var victimSel = document.getElementById('reportVictimSelect');
  var opts = state.dreams.map(function(d) {
    return '<option value="' + d.id + '">' + d.name + '</option>';
  }).join('');
  topSel.innerHTML = opts;
  victimSel.innerHTML = opts;
  topSel.selectedIndex = 0;
  victimSel.selectedIndex = Math.min(1, state.dreams.length - 1);
  document.getElementById('reportModal').style.display = 'flex';
}

function closeReportPanel() {
  document.getElementById('reportModal').style.display = 'none';
}

function submitReport() {
  var topId = document.getElementById('reportTopSelect').value;
  var victimId = document.getElementById('reportVictimSelect').value;

  if (!topId || !victimId) { showToast('请选择梦角'); return; }
  if (topId === victimId) { showToast('顶号者和被顶号者不能是同一个人'); return; }

  var top = state.dreams.find(function(d) { return d.id === topId; });
  var victim = state.dreams.find(function(d) { return d.id === victimId; });
  if (!top || !victim) return;

  var now = Date.now();
  var until = now + 5 * 60 * 1000;

  // 封禁被顶号者
  state.bannedDreams = (state.bannedDreams || []).filter(function(x) { return x.dreamId !== victimId; });
   state.bannedDreams.push({ dreamId: victimId, until: until, startAt: now });
  // 顶号者强制道歉
  state.apologizingDreams = (state.apologizingDreams || []).filter(function(x) { return x.dreamId !== topId; });
  state.apologizingDreams.push({ dreamId: topId, until: until, startAt: now });

  // 在聊天界面加通知面板
  var chatId = state.currentChatId;
  if (chatId) {
    var myName = state.profile.name || '我';
    if (!state.chatSessions[chatId]) state.chatSessions[chatId] = [];
    state.chatSessions[chatId].push({
      from: 'system',
      type: 'report_notice',
      text: '「' + myName + '」举报了「' + top.name + '」的顶号行为\n违规顶号者：' + top.name + '\n被顶号者：' + victim.name + '\n处罚开始',
      time: now
    });
    saveState();
    loadChatMessages();
    renderChatMessages();
  }

  saveState();
  closeReportPanel();
  showToast('举报成功，「' + victim.name + '」已被封禁 5 分钟');
}

// ===== 小助手 · 外挂 =====
function openCheatPanel() {
  closeAssistantModal();
  if (!state.currentChatId || !state.currentChatId.startsWith('group_')) {
    showToast('外挂只能用于群聊模式');
    return;
  }
  var today = new Date().toISOString().slice(0, 10);
  if (!state.cheatUsage || state.cheatUsage.date !== today) {
    state.cheatUsage = { date: today, unbanGroups: [], seizeGroups: [] };
    saveState();
  }
  var gid = state.currentChatId;
  var unbanUsed = state.cheatUsage.unbanGroups.indexOf(gid) > -1;
  var seizeUsed = state.cheatUsage.seizeGroups.indexOf(gid) > -1;
  document.getElementById('cheatUnbanHint').textContent = unbanUsed ? '今日已在本群使用' : '每天一次';
  document.getElementById('cheatSeizeHint').textContent = seizeUsed ? '今日已在本群使用' : '每天一次';
  document.getElementById('cheatModal').style.display = 'flex';
}

function closeCheatPanel() {
  document.getElementById('cheatModal').style.display = 'none';
}

function cheatUnbanSelf() {
  if (!state.currentChatId || !state.currentChatId.startsWith('group_')) return;
  var today = new Date().toISOString().slice(0, 10);
  if (!state.cheatUsage || state.cheatUsage.date !== today) {
    state.cheatUsage = { date: today, unbanGroups: [], seizeGroups: [] };
  }
  var gid = state.currentChatId;
  if (state.cheatUsage.unbanGroups.indexOf(gid) > -1) { showToast('今日已在本群使用过'); return; }

  var g = state.groups.find(function(x) { return x.id === gid; });
  if (!g) return;
  if (!g.muteEndsAt || g.muteEndsAt['user'] === undefined) { showToast('你当前没有被禁言'); return; }

  delete g.muteEndsAt['user'];
  state.cheatUsage.unbanGroups.push(gid);

  var myName = state.profile.name || '我';
  if (!state.chatSessions[gid]) state.chatSessions[gid] = [];
  state.chatSessions[gid].push({ from: 'system', text: '「' + myName + '」利用外挂解除了自己的禁言！', time: Date.now() });
  saveState();
  loadChatMessages();
  renderChatMessages();
  closeCheatPanel();
  showToast('已解除禁言');
}

function cheatSeizeOwner() {
  if (!state.currentChatId || !state.currentChatId.startsWith('group_')) return;
  var today = new Date().toISOString().slice(0, 10);
  if (!state.cheatUsage || state.cheatUsage.date !== today) {
    state.cheatUsage = { date: today, unbanGroups: [], seizeGroups: [] };
  }
  var gid = state.currentChatId;
  if (state.cheatUsage.seizeGroups.indexOf(gid) > -1) { showToast('今日已在本群使用过'); return; }

  var g = state.groups.find(function(x) { return x.id === gid; });
  if (!g) return;
  if (g.ownerId === 'user') { showToast('你已经是群主了'); return; }

  g.ownerId = 'user';
  state.cheatUsage.seizeGroups.push(gid);

  var myName = state.profile.name || '我';
  if (!state.chatSessions[gid]) state.chatSessions[gid] = [];
  state.chatSessions[gid].push({ from: 'system', text: '「' + myName + '」利用外挂夺回了群主！', time: Date.now() });
  saveState();
  loadChatMessages();
  renderChatMessages();
  closeCheatPanel();
  showToast('已夺回群主');
}

// ===== 小助手 · 状态查询 =====
var APOLOGY_PHRASES = ['我错了', '我再也不顶号了', '下次再也不犯了', '对不起，是我不对', '我保证这是最后一次'];

function pickApology() {
  return APOLOGY_PHRASES[Math.floor(Math.random() * APOLOGY_PHRASES.length)];
}

function getDreamBanStatus(dreamId, msgTime) {
  if (!dreamId) return 'normal';
  var t = msgTime || Date.now();

  // 找该梦角所有封禁记录
  var bans = (state.bannedDreams || []).filter(function(x) { return x.dreamId === dreamId; });
  for (var i = 0; i < bans.length; i++) {
    var x = bans[i];
    // 消息发送时间落在处罚期间内 → 永久显示为封禁
    if (t >= (x.startAt || 0) && t <= x.until) return 'banned';
  }

  var apolos = (state.apologizingDreams || []).filter(function(x) { return x.dreamId === dreamId; });
  for (var j = 0; j < apolos.length; j++) {
    var y = apolos[j];
    if (t >= (y.startAt || 0) && t <= y.until) return 'apologizing';
  }

  return 'normal';
}

// ===== 小助手 · 处罚到期检测 =====
function checkAssistantExpiry() {
  var now = Date.now();
  var changed = false;

  // 检查封禁
  (state.bannedDreams || []).forEach(function(x) {
    if (x.until <= now && !x.notified) {
      x.notified = true;
      changed = true;
      var victim = state.dreams.find(function(d) { return d.id === x.dreamId; });
      if (victim) {
        var notice = '对「' + victim.name + '」的封禁已结束，账号恢复正常';
        Object.keys(state.chatSessions || {}).forEach(function(cid) {
          var inPrivate = (cid === victim.id);
          var g = state.groups.find(function(g) { return g.id === cid; });
          var inGroup = g && g.memberIds.indexOf(victim.id) > -1;
          if (inPrivate || inGroup) {
            state.chatSessions[cid].push({ from: 'system', text: notice, time: now });
          }
        });
      }
    }
  });

  // 检查强制道歉
  (state.apologizingDreams || []).forEach(function(x) {
    if (x.until <= now && !x.notified) {
      x.notified = true;
      changed = true;
      var top = state.dreams.find(function(d) { return d.id === x.dreamId; });
      if (top) {
        var notice2 = '对「' + top.name + '」的强制道歉已结束，账号恢复正常';
        Object.keys(state.chatSessions || {}).forEach(function(cid) {
          var inPrivate = (cid === top.id);
          var g = state.groups.find(function(g) { return g.id === cid; });
          var inGroup = g && g.memberIds.indexOf(top.id) > -1;
          if (inPrivate || inGroup) {
            state.chatSessions[cid].push({ from: 'system', text: notice2, time: now });
          }
        });
      }
    }
  });

  if (changed) {
    saveState();
    if (state.currentChatId) {
      loadChatMessages();
      renderChatMessages();
    }
  }
}

// ===== 音乐功能 · 本地导入 =====
function renderMusicList() {
  var container = document.getElementById('musicListContainer');
  if (!container) return;
  var songs = state.musicLibrary.songs || [];
  if (songs.length === 0) {
    container.innerHTML = '<div style="padding:60px 20px;text-align:center;color:#86868b;font-size:14px;">还没有音乐，点右上角 + 导入吧</div>';
    return;
  }
  var html = '';
  songs.forEach(function(song, idx) {
    html += '<div onclick="playMusic(' + idx + ')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;">';
    html += '<span style="font-size:13px;color:#86868b;width:20px;text-align:center;">' + (idx + 1) + '</span>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-size:14px;font-weight:500;color:#1d1d1f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (song.title || song.fileName) + '</div>';
    html += '<div style="font-size:12px;color:#86868b;margin-top:2px;">' + (song.artist || '未知艺术家') + '</div>';
    html += '</div>';
    html += '<span style="font-size:12px;color:#c7c7cc;">' + (song.duration ? formatMinSec(song.duration) : '--:--') + '</span>';
    html += '<span onclick="event.stopPropagation();deleteMusic(' + idx + ')" style="font-size:16px;color:#ff3b30;padding:6px 10px;cursor:pointer;user-select:none;">🗑</span>';
    html += '</div>';
  });
  container.innerHTML = html;
}

function deleteMusic(idx) {
  var songs = state.musicLibrary.songs || [];
  if (idx < 0 || idx >= songs.length) return;
  var song = songs[idx];
  if (!confirm('确定删除「' + (song.title || song.fileName) + '」吗？')) return;

  songs.splice(idx, 1);

  // 处理正在播放的情况
  if (currentMusicIndex === idx) {
    // 删的就是当前播放的 → 停止
    musicPlayer.pause();
    musicPlayer.removeAttribute('src');
    musicPlayer.load();
    currentMusicIndex = -1;
    var ball = document.getElementById('musicBall');
    if (ball) ball.style.display = 'none';
    var panel = document.getElementById('musicPanel');
    if (panel) panel.style.display = 'none';
  } else if (currentMusicIndex > idx) {
    // 删的在当前播放的前面 → 索引前移 1
    currentMusicIndex--;
  }

  saveState();
  renderMusicList();
  showToast('已删除');
}

function openMusicImport() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  input.multiple = true;
  input.onchange = function(e) {
    var files = e.target.files;
    if (!files || files.length === 0) return;
    var loaded = 0;
    var total = files.length;
    for (var i = 0; i < files.length; i++) {
      (function(file) {
        var reader = new FileReader();
        reader.onload = function(ev) {
          var audio = new Audio();
          audio.src = ev.target.result;
          audio.addEventListener('loadedmetadata', function() {
            var song = {
              id: 'song_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              fileName: file.name,
              title: file.name.replace(/\.[^.]+$/, ''),
              artist: '未知艺术家',
              duration: Math.floor(audio.duration) || 0,
              dataUrl: ev.target.result,
              addedAt: Date.now()
            };
            state.musicLibrary.songs.push(song);
            loaded++;
            if (loaded === total) {
              saveState();
              renderMusicList();
              showToast('成功导入 ' + total + ' 首音乐');
            }
          });
        };
        reader.readAsDataURL(file);
      })(files[i]);
    }
  };
  input.click();
}

// ===== 音乐功能 · 播放器 =====
var musicPlayer = new Audio();
var currentMusicIndex = -1;
musicPlayer.addEventListener('timeupdate', function() {
  updateMusicBar();
});
musicPlayer.addEventListener('loadedmetadata', function() {
  updateMusicBar();
});
musicPlayer.addEventListener('ended', function() {
  nextMusic();
});
musicPlayer.addEventListener('play', function() {
  var btn = document.getElementById('musicBarPlayBtn');
  if (btn) btn.textContent = '⏸';
  updateMusicBar();
});
musicPlayer.addEventListener('pause', function() {
  var btn = document.getElementById('musicBarPlayBtn');
  if (btn) btn.textContent = '▶';
});

setTimeout(function() {
  var ball = document.getElementById('musicBall');
  if (ball) ball.style.display = 'none';
  var panel = document.getElementById('musicPanel');
  if (panel) panel.style.display = 'none';
}, 100);

function playMusic(idx) {
  var songs = state.musicLibrary.songs || [];
  if (idx < 0 || idx >= songs.length) return;
  currentMusicIndex = idx;
  musicPlayer.src = songs[idx].dataUrl;
  // 立刻刷新一次，把歌名和时长填上
  updateMusicBar();
  document.getElementById('musicBall').style.display = 'none';
  document.getElementById('musicPanel').style.display = 'block';
  musicPlayer.play().then(function() {
    updateMusicBar();
  }).catch(function(e) {
    showToast('播放失败：' + e.message);
  });
}

function showMusicBall() {
  document.getElementById('musicBall').style.display = 'flex';
}

function expandMusicPanel() {
  document.getElementById('musicBall').style.display = 'none';
  document.getElementById('musicPanel').style.display = 'block';
  updateMusicBar();
}

function collapseMusicPanel() {
  document.getElementById('musicPanel').style.display = 'none';
  document.getElementById('musicBall').style.display = 'flex';
}

function togglePlayMusic() {
  if (!musicPlayer.src) return;
  if (musicPlayer.paused) {
    musicPlayer.play();
    updateMusicBar();
  } else {
    musicPlayer.pause();
    updateMusicBar();
  }
}

function updateMusicBar() {
  var songs = state.musicLibrary.songs || [];
  if (currentMusicIndex < 0 || currentMusicIndex >= songs.length) {
    var ball = document.getElementById('musicBall');
    if (ball) ball.style.display = 'none';
    var panel = document.getElementById('musicPanel');
    if (panel) panel.style.display = 'none';
    return;
  }
  var s = songs[currentMusicIndex];
  var titleEl = document.getElementById('musicBarTitle');
  var artistEl = document.getElementById('musicBarArtist');
  if (titleEl) titleEl.textContent = s.title || s.fileName || '未命名';
  if (artistEl) artistEl.textContent = s.artist || '未知艺术家';
  var playBtn = document.getElementById('musicBarPlayBtn');
  if (playBtn) playBtn.textContent = musicPlayer.paused ? '▶' : '⏸';

  var cur = musicPlayer.currentTime || 0;
  // 【修复】duration 优先从歌曲元数据读，避免加载延迟
  var dur = musicPlayer.duration;
  if (!dur || isNaN(dur) || dur === Infinity) {
    dur = s.duration || 0;
  }
  var curEl = document.getElementById('musicBarCurrent');
  var durEl = document.getElementById('musicBarDuration');
  if (curEl) curEl.textContent = formatMinSec(cur);
  if (durEl) durEl.textContent = formatMinSec(dur);
  var prog = document.getElementById('musicBarProgress');
  if (prog && dur > 0) prog.value = (cur / dur) * 100;

  var innerProg = document.getElementById('musicBallProgressInner');
  if (innerProg && dur > 0) innerProg.style.width = ((cur / dur) * 100) + '%';
}

function formatMinSec(sec) {
  sec = Math.floor(sec) || 0;
  var m = Math.floor(sec / 60);
  var s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function stopMusic() {
  musicPlayer.pause();
  musicPlayer.currentTime = 0;
  currentMusicIndex = -1;
  document.getElementById('musicBall').style.display = 'none';
  document.getElementById('musicPanel').style.display = 'none';
}

function nextMusic() {
  var songs = state.musicLibrary.songs || [];
  if (songs.length === 0) return;
  currentMusicIndex = (currentMusicIndex + 1) % songs.length;
  playMusic(currentMusicIndex);
}

function prevMusic() {
  var songs = state.musicLibrary.songs || [];
  if (songs.length === 0) return;
  currentMusicIndex = (currentMusicIndex - 1 + songs.length) % songs.length;
  playMusic(currentMusicIndex);
}

// 进度条拖动
document.addEventListener('input', function(e) {
  if (e.target && e.target.id === 'musicBarProgress') {
    var dur = musicPlayer.duration || 0;
    if (dur > 0) {
      musicPlayer.currentTime = (e.target.value / 100) * dur;
    }
  }
  });

  // ===== 音乐悬浮球 · 点击展开 + 拖拽 =====
(function bindMusicBall() {
  var ball = document.getElementById('musicBall');
  if (!ball) { setTimeout(bindMusicBall, 300); return; }
  if (ball._bound) return;
  ball._bound = true;

  var isDragging = false;
  var moved = false;
  var startX = 0, startY = 0;
  var startLeft = 0, startTop = 0;
  var phone = document.querySelector('.phone');
  var lastDragTime = 0;

  function onStart(e) {
    var cx = e.touches ? e.touches[0].clientX : e.clientX;
    var cy = e.touches ? e.touches[0].clientY : e.clientY;
    var phoneRect = phone.getBoundingClientRect();
    var ballRect = ball.getBoundingClientRect();
    startX = cx;
    startY = cy;
    startLeft = ballRect.left - phoneRect.left;
    startTop = ballRect.top - phoneRect.top;
    moved = false;
    isDragging = true;
    ball.style.right = 'auto';
    ball.style.bottom = 'auto';
    ball.style.left = startLeft + 'px';
    ball.style.top = startTop + 'px';
    ball.classList.add('dragging');
  }

  function onMove(e) {
    if (!isDragging) return;
    var cx = e.touches ? e.touches[0].clientX : e.clientX;
    var cy = e.touches ? e.touches[0].clientY : e.clientY;
    var dx = cx - startX;
    var dy = cy - startY;
    // 阈值改成 15px，避免误判
    if (Math.abs(dx) > 15 || Math.abs(dy) > 15) moved = true;
    if (!moved) return;
    if (e.cancelable) e.preventDefault();
    var phoneRect = phone.getBoundingClientRect();
    var newLeft = startLeft + dx;
    var newTop = startTop + dy;
    newLeft = Math.max(4, Math.min(newLeft, phoneRect.width - ball.offsetWidth - 4));
    newTop = Math.max(4, Math.min(newTop, phoneRect.height - ball.offsetHeight - 4));
    ball.style.left = newLeft + 'px';
    ball.style.top = newTop + 'px';
  }

  function onEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    ball.classList.remove('dragging');

    if (moved) {
      // 拖拽过 → 吸附到左右边
      var phoneRect = phone.getBoundingClientRect();
      var curLeft = parseFloat(ball.style.left) || 0;
      var curTop = parseFloat(ball.style.top) || 0;
      var snapLeft = (curLeft + ball.offsetWidth / 2 < phoneRect.width / 2)
        ? 20
        : (phoneRect.width - ball.offsetWidth - 20);
      ball.style.left = snapLeft + 'px';
      ball.style.top = curTop + 'px';
      lastDragTime = Date.now();
    } else {
      // 纯点击 → 打开面板
      expandMusicPanel();
    }
  }

  ball.addEventListener('touchstart', onStart, { passive: true });
  ball.addEventListener('touchmove', onMove, { passive: false });
  ball.addEventListener('touchend', onEnd);
  ball.addEventListener('touchcancel', onEnd);
  ball.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
})();

// ===== 梦角状态系统 =====
function tickDreamStatus() {
  if (!state.dreams || state.dreams.length === 0) return;
  var now = Date.now();
  var changed = false;
  state.dreams.forEach(function(d) {
    if (!d.statuses || d.statuses.length === 0) return;
    // 兜底：如果状态池有内容但当前状态为空，立刻选一个
    if (!d.currentStatus) {
      d.currentStatus = d.statuses[0];
      changed = true;
    }
    var last = d.statusUpdateAt || 0;
    if (now - last < 60 * 60 * 1000) return;
    d.statusUpdateAt = now;
    if (Math.random() < 0.5) {
      d.currentStatus = d.statuses[Math.floor(Math.random() * d.statuses.length)];
      changed = true;
    }
  });

  if (changed) {
    saveState();
    try { renderChatList(); } catch(e) {}
    if (state.currentChatId && !state.currentChatId.startsWith('group_')) {
      var d2 = state.dreams.find(function(x){ return x.id === state.currentChatId; });
      var header = document.getElementById('chatHeaderName');
      if (d2 && header) header.textContent = d2.name + (d2.currentStatus ? ' · ' + d2.currentStatus : '');
    }
  }
}

function startDreamStatusTicker() {
  tickDreamStatus();
  setInterval(tickDreamStatus, 5 * 60 * 1000);
}

window._dreamStatusCollapsed = true;

function toggleDreamStatusCollapse() {
  window._dreamStatusCollapsed = !window._dreamStatusCollapsed;
  var body = document.getElementById('dreamStatusBody');
  var arrow = document.getElementById('dreamStatusArrow');
  if (body) body.style.display = window._dreamStatusCollapsed ? 'none' : 'block';
  if (arrow) arrow.style.transform = window._dreamStatusCollapsed ? '' : 'rotate(180deg)';
}

// ===== 编辑页状态池 =====
function renderDreamStatusList() {
  var d = state.dreams.find(function(x) { return x.id === state.currentEditDreamId; });
  if (!d) return;
  if (!d.statuses) d.statuses = [];
  var list = document.getElementById('dreamStatusList');
  if (!list) return;
    // 更新计数
  var cntEl = document.getElementById('dreamStatusCount');
  if (cntEl) cntEl.textContent = d.statuses.length;

  // 恢复折叠状态
  var body = document.getElementById('dreamStatusBody');
  var arrow = document.getElementById('dreamStatusArrow');
  if (body) body.style.display = window._dreamStatusCollapsed ? 'none' : 'block';
  if (arrow) arrow.style.transform = window._dreamStatusCollapsed ? '' : 'rotate(180deg)';

  if (d.statuses.length === 0) {
    list.innerHTML = '<div style="font-size:12px;color:var(--gray);padding:6px 0;">还没有状态，添加一条试试</div>';
    return;
  }
  list.innerHTML = d.statuses.map(function(s, i) {
    var isCurrent = (d.currentStatus === s);
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:' + (isCurrent ? 'rgba(0,122,255,0.08)' : 'rgba(0,0,0,0.03)') + ';border-radius:10px;">' +
      '<span style="font-size:13px;color:var(--text);">' + s + (isCurrent ? ' <span style="color:var(--blue);font-size:11px;">（当前）</span>' : '') + '</span>' +
      '<span onclick="deleteDreamStatus(' + i + ')" style="color:var(--red);cursor:pointer;font-size:16px;padding:0 4px;">×</span>' +
      '</div>';
  }).join('');
}

function addDreamStatus() {
  var d = state.dreams.find(function(x) { return x.id === state.currentEditDreamId; });
  if (!d) return;
  if (!d.statuses) d.statuses = [];
  var input = document.getElementById('newStatusInput');
  var val = (input.value || '').trim();
  if (!val) return;
  if (d.statuses.indexOf(val) > -1) { showToast('该状态已存在'); return; }
  d.statuses.push(val);
  // 如果当前还没有选中的状态，就把这条设为当前
  if (!d.currentStatus) d.currentStatus = val;
  input.value = '';
  saveState();
  renderDreamStatusList();
}

function batchAddDreamStatus() {
  var d = state.dreams.find(function(x) { return x.id === state.currentEditDreamId; });
  if (!d) return;
  var raw = prompt('批量添加状态，每行一个：');
  if (!raw) return;
  var lines = raw.split('\n').map(function(s){return s.trim();}).filter(function(s){return s;});
  if (lines.length === 0) return;
  if (!d.statuses) d.statuses = [];
  var added = 0;
  lines.forEach(function(l) {
    if (d.statuses.indexOf(l) === -1) { d.statuses.push(l); added++; }
  });
  // 如果当前还没有选中的状态，就把新加的第一条设为当前
  if (!d.currentStatus && d.statuses.length > 0) d.currentStatus = d.statuses[0];
  saveState();
  renderDreamStatusList();
  showToast('已添加 ' + added + ' 条');
}

function deleteDreamStatus(i) {
  var d = state.dreams.find(function(x) { return x.id === state.currentEditDreamId; });
  if (!d || !d.statuses) return;
  var removed = d.statuses[i];
  d.statuses.splice(i, 1);
  if (d.currentStatus === removed) d.currentStatus = '';
  saveState();
  renderDreamStatusList();
}

// ===== 梦境回忆系统 =====
var DREAM_CLUE_WORDS = [
  '蝴蝶','月亮','深林','镜子','雨','河流','旧屋','钥匙','钟表','云端',
  '楼梯','烛火','飞鸟','猫','门','电话','火车','风铃','大海','雪花',
  '影子','光','隧道','书页','戒指','玻璃','星星','桥','树屋','窗',
  '照片','雨伞','鲸鱼','沙漏','信箱','花海','纸飞机','风','列车站','灯塔',
  '人偶','素描','雨天','黄昏','紫罗兰','棉花糖','墨水','羽毛','玻璃球','耳机',
  '围巾','咖啡杯','糖纸','邮票','蜡烛','灯笼','苹果','水果','欲望','你','其他人','床','情书','爱','小狗','暗号','二人世界','传讯','无法言语','想你','分离','美梦','噩梦','婚礼','工作','模糊','山','水','火','风','雨','雪','雷','电','日','月','星','云','花','草','树','木','林','海','河','湖','江','川','泉','石','土','田','路','桥','车','船','家','门','窗','床','桌','椅','灯','书','笔','纸','画','歌','舞','心','头','手','脚','眼','耳','口','鼻','牙','舌','脸','天空','大地','太阳','月亮','星星','白云','乌云','风雨','雷电','闪电','彩虹','露水','冰雪','雪花','河流','大海','湖泊','山川','山峰','山谷','森林','草原','沙漠','田野','土地','石头','沙子','泥土','泉水','瀑布','海浪','空气','阳光','月光','星光','火光','灯光','春风','蓝天','青山','绿水','大树','小草','小鸟','小鱼','老虎','狮子','大象','熊猫','猴子','今天','明天','昨天','后天','前天','早上','上午','中午','下午','傍晚','晚上','夜晚','白天','黑夜','时间','时候','年代','岁月','季节','春天','夏天','秋天','冬天','周末','星期','小时','分钟','现在','过去','未来','以前','以后','最近','马上','立刻','忽然','突然','经常','一直','总是','有时','每天','每年','每月','每周','当天','当日','此时','那时','平日','爸爸','妈妈','爷爷','奶奶','哥哥','姐姐','弟弟','妹妹','叔叔','阿姨','舅舅','姑姑','孩子','大人','老人','朋友','同学','老师','学生','医生','护士','警察','工人','农民','商人','司机','厨师','律师','作家','画家','歌手','演员','记者','士兵','领导','同事','邻居','客人','主人','男人','女人','男孩','女孩','青年','少年','儿童','家人','亲人','爱人','自己','身体','头发','眼睛','眉毛','鼻子','耳朵','嘴巴','嘴唇','舌头','牙齿','脖子','肩膀','胳膊','手指','手掌','拳头','肚子','后背','膝盖','脚趾','皮肤','骨头','肌肉','血液','心脏','大脑','头脑','面孔','脸色','眼神','声音','笑容','眼泪','汗水','力气','精神','体力','健康','疾病','伤口','体温','呼吸','心跳','脉搏','神经','细胞','器官','骨骼','脂肪','毛发','走路','跑步','跳跃','爬行','飞翔','游泳','吃饭','喝水','睡觉','起床','洗澡','刷牙','洗脸','穿衣','脱衣','开门','关门','坐下','站立','躺下','抬头','低头','回头','转身','举手','招手','拍手','握手','拥抱','微笑','大笑','哭泣','说话','聊天','唱歌','跳舞','读书','写字','画画','工作','学习','休息','玩耍','思考','记住','忘记','喜欢','讨厌','害怕','高兴','桌子','椅子','凳子','床铺','柜子','箱子','盒子','袋子','瓶子','杯子','盘子','碗筷','勺子','筷子','刀子','叉子','锅子','炉子','水壶','茶壶','茶杯','酒杯','饭碗','菜盘','汤匙','扫帚','拖把','抹布','水桶','脸盆','毛巾','牙刷','牙膏','肥皂','镜子','梳子','剪子','尺子','笔筒','书本','纸张','信封','邮票','日历','钟表','手表','眼镜','帽子','衣服','裤子','裙子','衬衫','外套','大衣','毛衣','袜子','鞋子','围巾','手套','腰带','米饭','面条','馒头','包子','饺子','馄饨','大饼','油条','豆浆','稀饭','炒饭','炒面','鸡蛋','鸭蛋','牛奶','酸奶','豆腐','青菜','白菜','萝卜','土豆','番茄','黄瓜','茄子','辣椒','大葱','大蒜','生姜','苹果','香蕉','橘子','橙子','葡萄','西瓜','桃子','梨子','草莓','樱桃','菠萝','芒果','柠檬','水果','蔬菜','牛肉','猪肉','羊肉','鸡肉','鱼肉','虾仁','螃蟹','汽车','火车','飞机','轮船','单车','摩托','公交','出租','地铁','高铁','车站','机场','码头','道路','公路','铁路','桥梁','隧道','街道','巷子','广场','公园','学校','医院','银行','商店','市场','超市','酒店','宾馆','餐厅','饭店','书店','影院','剧院','场馆','乐园','花园','果园','菜园','城市','乡村','农村','国家','世界','中国','外国','地方','地址','方向','问题','答案','方法','办法','原因','结果','计划','目标','理想','梦想',
  '爱','恋','情','缘','心','想','念','思','慕','追','约','吻','抱','牵','疼','宠','甜','蜜','暖','柔','娇','羞','痴','醉','迷','盼','望','守','伴','陪','依','靠','拥','亲','搂','婚','嫁','娶','妻','夫','郎','娘','君','卿','双','对','聚','逢','遇','见',
'恋爱','爱情','恋人','情侣','伴侣','爱人','对象','男友','女友','老公','老婆','妻子','丈夫','夫妻','未婚','已婚','新婚','婚礼','婚宴','婚戒','婚纱','婚房','婚车','订婚','求婚','结婚','离婚','分手','和好','复合','告白','表白','示爱','求爱','追求','追爱','约会','相亲','相恋','相爱','相思','相守','相伴','相依','相拥','相吻','牵手','拥抱','亲吻','接吻',
'吻别','初吻','初恋','初爱','热恋','暗恋','单恋','苦恋','虐恋','迷恋','痴恋','眷恋','依恋','爱恋','贪恋','留恋','思恋','恋慕','爱慕','倾慕','仰慕','心动','心跳','心仪','心爱','心疼','心醉','心碎','心伤','心冷','心暖','心安','心定','心乱','心慌','心念','心想','心愿','心事','心情','心声','心意','心思','心弦','心扉','心田','心海','心间','心底','心中',
'心里','心尖','心肝','宝贝','宝宝','乖乖','亲爱的','甜心','甜蜜','甜美','甜言','蜜语','温柔','温暖','温存','温情','浪漫','情调','情话','情书','情诗','情歌','情缘','情分','情意','情义','情爱','情感','感情','情绪','情怀','情结','情网','情劫','情债','情伤','情泪','情痴','情种','情圣','情人','情敌','情场','情路','缘分','有缘','无缘','天缘','良缘','姻缘',
'奇缘','偶遇','相遇','邂逅','初见','一见','钟情','钟爱','中意','看中','看上','喜欢','喜爱','爱护','爱惜','疼爱','宠爱','溺爱','偏爱','挚爱','真爱','深爱','热爱','承诺','誓言','誓约','盟约','诺言','约定','山盟','海誓','永恒','永远','长久','白头','偕老','一生','一世','终生','终身','今世','来世','三生','三世','轮回','宿命','命运','注定','天意','天定',
'佳偶','良人','佳人','才子','淑女','美女','帅哥','王子','公主','骑士','英雄','女神','男神','红颜','知己','蓝颜','陪伴','陪同','陪护','守护','呵护','照顾','关心','关怀','关爱','体贴','体谅','理解','包容','宽容','忍让','迁就','妥协','让步','支持','鼓励','安慰','依靠','依赖','信赖','信任','忠诚','专一','痴心','真心','诚心','用心','专心','恒心','决心',
'勇气','勇敢','主动','被动','害羞','羞涩','腼腆','脸红','耳赤','加速','紧张','激动','兴奋','开心','快乐','幸福','美满','圆满','温馨','柔情','深情','痴情','真情','纯情','热情','激情','冲动','暧昧','朦胧','微妙','青涩','纯真','单纯','美好','美妙','美丽','可爱','迷人','动人','感人','动心','动情','生情','思念','想念','挂念','牵挂','惦记','惦念','怀念',
'眷念','不舍','难舍','离别','分别','分离','失恋','心痛','流泪','哭泣','伤心','难过','痛苦','煎熬','折磨','遗憾','后悔','错过','失去','放手','放下','忘记','回忆','记忆','往事','曾经','过去','从前','旧爱','新欢','前任','旧情','旧梦','旧人','故人','等待','等候','期盼','期待','盼望','希望','愿望','梦想','幻想','憧憬','向往','寻觅','寻找','寻爱','求偶',
'征婚','联谊','聚会','派对','舞会','烛光','晚餐','电影','逛街','散步','旅行','旅游','拍照','合影','礼物','鲜花','玫瑰','巧克力','戒指','项链','手链','卡片','短信','电话','微信','聊天','视频','语音','晚安','早安','问候','祝福','生日','纪念','周年','节日','情人节','七夕','圣诞','跨年','烟花','孔明灯','许愿','蜜月','婚纱照','结婚证','喜糖','喜酒','红包','伴娘',
'伴郎','新郎','新娘','岳父','岳母','公公','婆婆','亲家','家庭','家人','孩子','生育','怀孕','婴儿','母子','父女','父子','母女','亲情','恩爱','和睦','和谐','相敬','如宾','举案','齐眉','到老','携手','并肩','同行','同甘','共苦','不离','不弃','天长','地久','海枯','石烂','永结','同心','心心','相印','两情','相悦','朝朝','暮暮','生生','世世','唯美','倾城',
'玫瑰','红玫瑰','粉玫瑰','白玫瑰','蓝玫瑰','香槟玫瑰','郁金香','百合','满天星','勿忘我',
'薰衣草','栀子花','茉莉','樱花','桃花','杏花','梨花','海棠','牡丹','山茶',
'四叶草','幸运草','蒲公英','枫叶','银杏','红叶','柳枝','红豆','相思豆','紫藤',
'连理枝','藤蔓','绿萝','多肉','仙人掌','月季','蔷薇','紫罗兰','鸢尾','雏菊',
'花束','花瓣','花香','花雨','花海','花田','花环','花冠','花枝','花墙',
'星空','银河','流星','流星雨','星座','北极星','月亮','满月','新月','月牙',
'日出','日落','朝霞','晚霞','晨曦','黄昏','彩虹','极光','云海','星海',
'海浪','沙滩','贝壳','海星','珍珠','珊瑚','海螺','潮汐','海风','灯塔',
'小溪','河流','湖泊','海洋','瀑布','喷泉','温泉','岛屿','帆船','游艇',
'春风','微风','晚风','细雨','雨滴','雨伞','雪花','雪人','霜花','雾凇',
'戒指','项链','手链','脚链','耳环','胸针','发夹','发簪','梳子','镜子',
'情书','信封','信纸','邮票','明信片','火漆','印章','丝带','蝴蝶结','礼盒',
'千纸鹤','纸星星','幸运星','许愿瓶','漂流瓶','时间胶囊','同心锁','连心锁','祈福牌','许愿牌',
'鲜花','巧克力','钱包','口红','化妆品','首饰','玩偶','公仔','音乐盒','拼图',
'水晶球','沙漏','风铃','相册','照片','合影','拍立得','胶片','相框','照片墙',
'蛋糕','马卡龙','提拉米苏','布丁','果冻','冰淇淋','圣代','奶昔','棉花糖','棒棒糖',
'巧克力火锅','蜂蜜','糖霜','奶油','甜甜圈','泡芙','蛋挞','曲奇','饼干','糖果',
'咖啡','拿铁','卡布奇诺','热可可','奶茶','红酒','香槟','气泡酒','鸡尾酒','果汁',
'烛光晚餐','野餐','烧烤','火锅','寿司','意大利面','披萨','牛排','沙拉','慕斯',
'草莓','樱桃','葡萄','苹果','柠檬','蜜桃','石榴','无花果','蓝莓','树莓',
'沙发','地毯','壁炉','摇椅','吊篮','秋千','吊床','帐篷','阳台','天台',
'窗帘','窗台','台灯','夜灯','香薰灯','蜡烛','烛台','灯罩','盆栽','花瓶',
'情歌','歌词','旋律','音符','唱片','黑胶','磁带','CD','广播','电台',
'钢琴','吉他','小提琴','大提琴','竖琴','笛子','口琴','萨克斯','古筝','琵琶',
'电影','电影院','电影票','剧院','音乐厅','演唱会','音乐会','舞会','派对','酒吧',
'书签','日记','笔记本','钢笔','墨水','铅笔','橡皮','尺子','彩笔','画本',
'情诗','诗歌','小说','散文','童话','寓言','传说','神话','典故','对联',
'相机','镜头','三脚架','自拍杆','快门','底片','胶卷','滤镜','光影','剪影',
'旅行箱','背包','地图','指南针','机票','车票','船票','门票','护照','签证',
'汽车','火车','飞机','轮船','单车','摩托','公交','出租','地铁','高铁',
'公园','湖边','海边','湖畔','古镇','小巷','石桥','拱桥','廊桥','雨巷',
'咖啡馆','茶馆','书店','图书馆','博物馆','美术馆','画廊','植物园','水族馆','天文馆',
'埃菲尔铁塔','凯旋门','卢浮宫','大本钟','伦敦眼','自由女神','金门大桥','富士山','圣托里尼','爱琴海',
'婚纱','礼服','西装','领结','领带','袖扣','头纱','婚戒','捧花','婚礼',
'教堂','钟声','白鸽','气球','彩带','彩灯','灯串','霓虹','红毯','喜糖',
'长裙','白衬衫','牛仔裤','帆布鞋','球鞋','高跟鞋','围巾','手套','帽子','墨镜',
'手表','手镯','手帕','丝巾','披肩','腰带','荷包','香囊','绣球','红绳',
'香水','香薰','精油','香膏','香皂','沐浴露','洗发水','浴盐','花瓣浴','牛奶浴',
'天鹅','鸳鸯','蝴蝶','蜻蜓','萤火虫','海豚','企鹅','猫咪','狗狗','兔子',
'小鹿','狐狸','熊猫','考拉','松鼠','刺猬','仓鼠','金鱼','锦鲤','海龟',
'约会','告白','求婚','订婚','结婚','牵手','拥抱','亲吻','接吻','吻别',
'逛街','散步','旅行','旅游','拍照','看星星','看电影','听音乐','跳舞','唱歌',
'情人节','七夕','圣诞','跨年','生日','纪念日','周年','元宵','中秋','春节',
'烟花','爆竹','仙女棒','冷烟花','荧光棒','孔明灯','河灯','花灯','灯笼','许愿池',
'摩天轮','旋转木马','过山车','鬼屋','迷宫','镜子屋','万花筒','抓娃娃','盲盒','扭蛋',
'塔罗','占卜','星盘','塔罗牌','幸运符','护身符','平安符','月老','红线','签文',
'三生石','姻缘','宿命','轮回','三生三世','比翼鸟','牛郎织女','鹊桥','同心结','并蒂莲',
'缘分','爱情','浪漫','甜蜜','温柔','温暖','幸福','美满','永恒','誓言',
'月光','星光','灯光','烛光','火光','光晕','光环','光斑','倒影','投影',
'泡泡','肥皂泡','风筝','纸飞机','热气球','风车','沙堡','许愿星','纸船','竹蜻蜓',
'愚者','魔术师','女祭司','女皇','皇帝','教皇','恋人','战车','力量','隐士','命运之轮','正义','倒吊人','死神','节制','恶魔','高塔','星星','月亮','太阳','审判','世界',
'权杖Ace','权杖二','权杖三','权杖四','权杖五','权杖六','权杖七','权杖八','权杖九','权杖十','权杖侍从','权杖骑士','权杖王后','权杖国王',
'圣杯Ace','圣杯二','圣杯三','圣杯四','圣杯五','圣杯六','圣杯七','圣杯八','圣杯九','圣杯十','圣杯侍从','圣杯骑士','圣杯王后','圣杯国王',
'宝剑Ace','宝剑二','宝剑三','宝剑四','宝剑五','宝剑六','宝剑七','宝剑八','宝剑九','宝剑十','宝剑侍从','宝剑骑士','宝剑王后','宝剑国王',
'星币Ace','星币二','星币三','星币四','星币五','星币六','星币七','星币八','星币九','星币十','星币侍从','星币骑士','星币王后','星币国王',
'米饭','面条','馒头','包子','饺子','馄饨','烧麦','汤圆','粽子','年糕',
'炒饭','炒面','拌面','拉面','刀削面','炸酱面','热干面','阳春面','牛肉面','肥肠面',
'米线','米粉','河粉','肠粉','凉皮','凉面','酿皮','粉丝','粉条','螺蛳粉',
'火锅','麻辣烫','串串香','关东煮','烧烤','铁板烧','涮羊肉','烤鸭','烧鸡','白切鸡',
'宫保鸡丁','鱼香肉丝','回锅肉','麻婆豆腐','水煮鱼','酸菜鱼','红烧肉','糖醋排骨','糖醋里脊','咕噜肉',
'京酱肉丝','木须肉','蚂蚁上树','夫妻肺片','口水鸡','辣子鸡','大盘鸡','黄焖鸡','三杯鸡','盐焗鸡',
'东坡肉','梅菜扣肉','粉蒸肉','红烧狮子头','四喜丸子','肉丸','鱼丸','虾丸','牛肉丸','猪肉丸',
'小笼包','灌汤包','生煎包','叉烧包','奶黄包','豆沙包','花卷','烙饼','煎饼','手抓饼',
'葱油饼','鸡蛋灌饼','肉夹馍','汉堡','三明治','热狗','披萨','意大利面','千层面','通心粉',
'寿司','刺身','天妇罗','乌冬面','荞麦面','味噌汤','石锅拌饭','泡菜','部队锅','韩式炸鸡',
'咖喱饭','蛋包饭','盖浇饭','煲仔饭','扬州炒饭','菠萝炒饭','石锅饭','卤肉饭','鸡肉饭','猪脚饭',
'烧鹅','烧肉','叉烧','腊肉','腊肠','火腿','培根','香肠','午餐肉','肉松',
'鸡蛋','鸭蛋','鹌鹑蛋','皮蛋','咸蛋','茶叶蛋','卤蛋','煎蛋','炒蛋','蒸蛋',
'豆腐','豆干','豆皮','腐竹','油豆腐','臭豆腐','豆腐脑','豆浆','豆花','纳豆',
'青菜','白菜','菠菜','生菜','油麦菜','空心菜','芹菜','韭菜','香菜','茼蒿',
'萝卜','胡萝卜','土豆','红薯','紫薯','山药','芋头','莲藕','荸荠','菱角',
'番茄','黄瓜','茄子','辣椒','青椒','彩椒','南瓜','冬瓜','丝瓜','苦瓜',
'西兰花','花菜','卷心菜','紫甘蓝','芦笋','竹笋','莴笋','豆角','四季豆','豌豆',
'蘑菇','香菇','金针菇','杏鲍菇','平菇','口蘑','木耳','银耳','海带','紫菜',
'苹果','香蕉','橘子','橙子','葡萄','西瓜','桃子','梨子','草莓','樱桃',
'菠萝','芒果','柠檬','柚子','石榴','猕猴桃','火龙果','百香果','荔枝','龙眼',
'木瓜','哈密瓜','甜瓜','香瓜','柿子','山楂','枣子','无花果','蓝莓','树莓',
'蛋糕','面包','饼干','曲奇','蛋挞','泡芙','布丁','果冻','冰淇淋','雪糕',
'巧克力','糖果','棉花糖','棒棒糖','牛轧糖','太妃糖','软糖','口香糖','马卡龙','甜甜圈',
'月饼','驴打滚','元宵','麻花','油条','春卷','锅贴','烧饼','酥饼','桃酥',
'瓜子','花生','核桃','杏仁','腰果','开心果','榛子','松子','板栗','夏威夷果',
'奶茶','咖啡','果汁','汽水','可乐','雪碧','酸奶','牛奶','椰奶','豆奶',
'啤酒','红酒','白酒','黄酒','米酒','鸡尾酒','香槟','威士忌','伏特加','朗姆酒',
'矿泉水','苏打水','气泡水','柠檬水','蜂蜜水','绿茶','红茶','乌龙茶','普洱茶','花茶',
'沙拉','浓汤','罗宋汤','玉米汤','南瓜汤','紫菜蛋花汤','番茄蛋汤','冬瓜排骨汤','鸡汤','骨头汤'
];

function getDreamDayKey() {
  var now = new Date();
  var d = new Date(now.getTime());
  if (now.getHours() < 5) d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function initDreamRecallDone() {
  if (!state.dreamRecallDone || typeof state.dreamRecallDone !== 'object') {
    state.dreamRecallDone = {};
  }
}

function hasRecalledToday(dreamId) {
  initDreamRecallDone();
  var key = getDreamDayKey();
  if (!state.dreamRecallDone[key]) return false;
  return state.dreamRecallDone[key].indexOf(dreamId) > -1;
}

function markDreamRecalled(dreamId) {
  initDreamRecallDone();
  var key = getDreamDayKey();
  if (!state.dreamRecallDone[key]) state.dreamRecallDone[key] = [];
  if (state.dreamRecallDone[key].indexOf(dreamId) === -1) {
    state.dreamRecallDone[key].push(dreamId);
  }
  // 自动清理 7 天前的记录，避免数据无限膨胀
  var allKeys = Object.keys(state.dreamRecallDone).sort();
  if (allKeys.length > 7) {
    allKeys.slice(0, allKeys.length - 7).forEach(function(k) {
      delete state.dreamRecallDone[k];
    });
  }
}

window._drSelectedId = null;
window._drStep = 'select';
window._drResult = null;

function renderDreamRecall() {
  if (!state.dreamRecall || typeof state.dreamRecall !== 'object') state.dreamRecall = { records: [] };
  if (!Array.isArray(state.dreamRecall.records)) state.dreamRecall.records = [];

  var avatarsEl = document.getElementById('drAvatarList');
  var mainEl = document.getElementById('drMain');
  if (!avatarsEl || !mainEl) return;

  if (!state.dreams || state.dreams.length === 0) {
    avatarsEl.innerHTML = '<div style="color:#6a7a95;font-size:13px;padding:8px 4px;">还没有梦角</div>';
    mainEl.innerHTML = '<div class="dr-hint">去梦角列表添加一个吧</div>';
    return;
  }

  avatarsEl.innerHTML = state.dreams.map(function(d) {
    var av = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2756%27 height=%2756%27 viewBox=%270 0 56 56%27%3E%3Ccircle cx=%2728%27 cy=%2728%27 r=%2728%27 fill=%27%231a2a45%27/%3E%3Ctext x=%2728%27 y=%2734%27 text-anchor=%27middle%27 fill=%27%237ec8e3%27 font-size=%2722%27%3E💜%3C/text%3E%3C/svg%3E';
    var selected = window._drSelectedId === d.id ? ' selected' : '';
    var done = hasRecalledToday(d.id) ? ' done' : '';
    return '<div class="dr-avatar-item' + selected + done + '" onclick="pickDreamForRecall(\'' + d.id + '\')">' +
      '<img class="dr-avatar-img" src="' + av + '">' +
      '<span class="dr-avatar-name">' + d.name + '</span>' +
      '<span class="dr-avatar-badge">' + (done ? '已回忆' : '') + '</span>' +
      '</div>';
  }).join('');

  if (!window._drSelectedId) {
    mainEl.innerHTML = '<div class="dr-hint">选择一位梦角<br><span style="font-size:12px;opacity:0.5;margin-top:8px;display:block;">每天早 5 点刷新，每位梦角每天可回忆一次</span></div>';
    return;
  }

  var d = state.dreams.find(function(x) { return x.id === window._drSelectedId; });
  if (!d) { window._drSelectedId = null; renderDreamRecall(); return; }

  if (hasRecalledToday(d.id) && window._drStep === 'select') {
    var rec = (state.dreamRecall && state.dreamRecall.records) ? state.dreamRecall.records.filter(function(r) {
      return r.dreamId === d.id && r.dayKey === getDreamDayKey();
    })[0] : null;

    if (!rec) {
      // 记录被删了，但今天已经回忆过 → 只显示"已完成"
      mainEl.innerHTML = '<div class="dr-card">' +
        '<div class="dr-card-title">今日回忆已完成</div>' +
        '<div class="dr-card-sub" style="opacity:0.6;margin-top:12px;">今天的回忆记录已被删除</div>' +
        '<div style="font-size:12px;color:#6a7a95;margin-top:16px;">明天早 5 点后可以再次回忆</div></div>';
      return;
    }

    mainEl.innerHTML = '<div class="dr-card">' +
      '<div class="dr-card-title">今日回忆已完成</div>' +
      (rec.hasDream
        ? '<div class="dr-card-sub">昨晚的线索</div><div class="dr-clue-row">' + (rec.clues || []).map(function(c) { return '<span class="dr-clue-tag">' + c + '</span>'; }).join('') + '</div>'
        : '<div class="dr-card-sub" style="opacity:0.6;margin-top:12px;">昨晚没有入梦</div>') +
      '<div style="font-size:12px;color:#6a7a95;margin-top:16px;">明天早 5 点后可以再次回忆</div></div>';
    return;
  }

  if (window._drStep === 'ready') {
    mainEl.innerHTML = '<div class="dr-card">' +
      '<div class="dr-card-title">' + d.name + ' 的梦</div>' +
      '<div class="dr-card-sub" style="margin-bottom:20px;">闭上眼睛，回忆昨晚</div>' +
      '<button class="dr-btn-primary" onclick="startDreamRecall()">开始回忆</button></div>';
    return;
  }

  if (window._drStep === 'result') {
    var hasDream = window._drResult.hasDream;
    mainEl.innerHTML = '<div class="dr-card">' +
      '<div class="dr-card-title">' + d.name + '</div>' +
      '<div class="dr-question">昨晚，你梦见我了吗？</div>' +
      '<div class="dr-answer ' + (hasDream ? 'yes' : 'no') + '">' +
      (hasDream ? '「我梦见你了。」' : '「昨晚...我没能梦见你。」') + '</div>' +
      (hasDream
        ? '<button class="dr-btn-primary" style="margin-top:24px;" onclick="getDreamClues()">点击获得梦境线索</button>'
        : '<div class="dr-card-sub" style="margin-top:20px;opacity:0.55;font-size:12px;">今晚，我会努力梦到你</div>') +
      '</div>';
    return;
  }

  if (window._drStep === 'clues') {
    mainEl.innerHTML = '<div class="dr-card">' +
      '<div class="dr-card-title">' + d.name + ' 的梦之线索</div>' +
      '<div class="dr-card-sub" style="margin-bottom:20px;">记住这五个词，它们藏着昨晚的梦</div>' +
      '<div class="dr-clue-row dr-clue-row-big">' + window._drResult.clues.map(function(c) { return '<span class="dr-clue-tag dr-clue-tag-big">' + c + '</span>'; }).join('') + '</div>' +
      '<div style="font-size:12px;color:#6a7a95;margin-top:24px;">今日回忆完成，明早 5 点后可再来</div></div>';
    return;
  }
}

function pickDreamForRecall(dreamId) {
  window._drSelectedId = dreamId;
  if (hasRecalledToday(dreamId)) {
    window._drStep = 'select';
  } else {
    window._drStep = 'ready';
    window._drResult = null;
  }
  renderDreamRecall();
}

function startDreamRecall() {
  window._drResult = { hasDream: Math.random() < 0.5, clues: null };
  window._drStep = 'result';

  // 立刻写记录（不管有没有入梦），线索先留空
  var d = state.dreams.find(function(x) { return x.id === window._drSelectedId; });
  if (d) {
    // 【核心修复】：标记这个梦角今天已回忆（与历史记录独立）
    markDreamRecalled(d.id);

    if (!state.dreamRecall) state.dreamRecall = { records: [] };
    if (!Array.isArray(state.dreamRecall.records)) state.dreamRecall.records = [];
    var record = {
      id: 'dr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      dreamId: d.id, dreamName: d.name, dreamAvatar: d.avatar || '',
      hasDream: window._drResult.hasDream, clues: [],
      timestamp: Date.now(), dayKey: getDreamDayKey()
    };
    state.dreamRecall.records.push(record);
    window._drCurrentRecordId = record.id;
    saveState();
  }

  renderDreamRecall();
}

function getDreamClues() {
  var pool = DREAM_CLUE_WORDS.slice();
  var picked = [];
  for (var i = 0; i < 5 && pool.length > 0; i++) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  window._drResult.clues = picked;
  window._drStep = 'clues';

  // 把线索补充到刚才那条记录里
  if (state.dreamRecall && state.dreamRecall.records && window._drCurrentRecordId) {
    var rec = state.dreamRecall.records.find(function(r) { return r.id === window._drCurrentRecordId; });
    if (rec) {
      rec.clues = picked.slice();
      saveState();
    }
  }
  renderDreamRecall();
}

// ===== 梦境历史 =====
window._drHistoryEdit = false;
window._drHistorySelected = [];

function openDreamHistory() {
  window._drHistoryEdit = false;
  window._drHistorySelected = [];
  updateDrHistoryEditBtn();
  renderDreamHistory();
  navigateTo('pageDreamHistory');
}

function toggleDreamHistoryEdit() {
  window._drHistoryEdit = !window._drHistoryEdit;
  if (!window._drHistoryEdit) window._drHistorySelected = [];
  updateDrHistoryEditBtn();
  renderDreamHistory();
}

function exitDreamHistoryEdit() {
  window._drHistoryEdit = false;
  window._drHistorySelected = [];
  updateDrHistoryEditBtn();
  renderDreamHistory();
}

function updateDrHistoryEditBtn() {
  var btn = document.getElementById('drHistoryEditBtn');
  var bar = document.getElementById('drHistoryActionBar');
  if (!btn) return;
  if (window._drHistoryEdit) {
    btn.textContent = '完成';
    if (bar) bar.style.display = 'flex';
  } else {
    btn.textContent = '编辑';
    if (bar) bar.style.display = 'none';
  }
}

function renderDreamHistory() {
  var listEl = document.getElementById('drHistoryList');
  if (!listEl) return;
  if (!state.dreamRecall || !state.dreamRecall.records || state.dreamRecall.records.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;color:#6a7a95;font-size:13px;padding:60px 20px;">还没有回忆记录</div>';
    return;
  }

  var sorted = state.dreamRecall.records.slice().sort(function(a, b) { return b.timestamp - a.timestamp; });

  listEl.innerHTML = sorted.map(function(r) {
    var t = new Date(r.timestamp);
    var timeStr = t.getFullYear() + '/' +
      String(t.getMonth() + 1).padStart(2, '0') + '/' +
      String(t.getDate()).padStart(2, '0') + ' ' +
      String(t.getHours()).padStart(2, '0') + ':' +
      String(t.getMinutes()).padStart(2, '0');

    var av = r.dreamAvatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%2720%27 fill=%27%231a2a45%27/%3E%3Ctext x=%2720%27 y=%2725%27 text-anchor=%27middle%27 fill=%27%237ec8e3%27 font-size=%2716%27%3E💜%3C/text%3E%3C/svg%3E';
    var selected = window._drHistorySelected.indexOf(r.id) > -1;

    var cluesHtml = '';
    if (r.hasDream && r.clues && r.clues.length > 0) {
      cluesHtml = '<div class="dr-h-clues">' + r.clues.map(function(c) { return '<span class="dr-clue-tag" style="font-size:12px;">' + c + '</span>'; }).join('') + '</div>';
    }

    var click = window._drHistoryEdit ? 'toggleDrHistorySelect(\'' + r.id + '\')' : '';

    return '<div class="dr-h-item' + (selected ? ' selected' : '') + '" onclick="' + click + '">' +
      (window._drHistoryEdit ? '<div class="dr-h-check' + (selected ? ' checked' : '') + '">' + (selected ? '✓' : '') + '</div>' : '') +
      '<img class="dr-h-avatar" src="' + av + '">' +
      '<div class="dr-h-info">' +
        '<div class="dr-h-name">' + r.dreamName + '</div>' +
        '<div class="dr-h-time">' + timeStr + '</div>' +
        '<div class="dr-h-status ' + (r.hasDream ? 'yes' : 'no') + '">' + (r.hasDream ? '✓ 有入梦' : '✗ 没有入梦') + '</div>' +
        cluesHtml +
      '</div></div>';
  }).join('');
}

function toggleDrHistorySelect(id) {
  var idx = window._drHistorySelected.indexOf(id);
  if (idx > -1) window._drHistorySelected.splice(idx, 1);
  else window._drHistorySelected.push(id);
  renderDreamHistory();
}

function drHistorySelectAll() {
  if (!state.dreamRecall || !state.dreamRecall.records) return;
  if (window._drHistorySelected.length === state.dreamRecall.records.length) {
    window._drHistorySelected = [];
  } else {
    window._drHistorySelected = state.dreamRecall.records.map(function(r) { return r.id; });
  }
  renderDreamHistory();
}

function drHistoryDeleteSelected() {
  if (window._drHistorySelected.length === 0) { showToast('请先选择要删除的记录'); return; }
  if (!confirm('确定删除选中的 ' + window._drHistorySelected.length + ' 条记录吗？')) return;
  state.dreamRecall.records = state.dreamRecall.records.filter(function(r) {
    return window._drHistorySelected.indexOf(r.id) === -1;
  });
  window._drHistorySelected = [];
  saveState();
  renderDreamHistory();
  showToast('已删除');
}

// ===== 问卷系统 =====
window._quizTab = 'dream';
window._quizAddTab = 'single';
window._quizCurrentPacketId = null;

function initQuizData() {
  if (!state.quizQuestions || !Array.isArray(state.quizQuestions)) state.quizQuestions = [];
  if (!state.quizGroups || !Array.isArray(state.quizGroups)) state.quizGroups = [];
  if (!state.quizHistory || !Array.isArray(state.quizHistory)) state.quizHistory = [];
}

function switchQuizTab(tab) {
  window._quizTab = tab;
    var _oldBar2 = document.getElementById('quizFixedBar');
  if (_oldBar2) _oldBar2.remove();
  var tabs = [
    { id: 'quizTabDream', key: 'dream' },
    { id: 'quizTabMe', key: 'me' },
    { id: 'quizTabHistory', key: 'history' }
  ];
  tabs.forEach(function(t) {
    var el = document.getElementById(t.id);
    if (!el) return;
    if (t.key === tab) {
      el.style.color = 'var(--blue)';
      el.style.borderBottom = '2px solid var(--blue)';
    } else {
      el.style.color = 'var(--gray)';
      el.style.borderBottom = '2px solid transparent';
    }
  });
  if (tab === 'dream') renderQuizDreamTab();
  else if (tab === 'me') renderQuizMeTab();
  else if (tab === 'history') renderQuizHistoryTab();
}

// ===== 梦角提问 Tab =====
function renderQuizDreamTab() {
  initQuizData();
  var content = document.getElementById('quizTabContent');
  if (!content) return;

  var totalSingle = state.quizQuestions.length;
  var totalGroups = state.quizGroups.length;

  var html = '';
  html += '<div style="padding:12px 16px 0;display:flex;gap:8px;">';
  html += '<button class="quiz-add-btn" onclick="openQuizAddModal()" style="flex:1;margin:0;">+ 添加问题</button>';
  html += '<button class="quiz-add-btn" onclick="openQuizDreamAddGroupModal()" style="flex:1;margin:0;">+ 添加分组</button>';
  html += '</div>';

  html += '<div style="padding:8px 16px 40px;">';
  html += '<div style="font-size:12px;color:var(--gray);margin-bottom:10px;">当前题库：' + totalSingle + ' 条 · ' + totalGroups + ' 组（梦角会随机抽 1-5 条 或 随机一个分组）</div>';

  // 分组列表
  if (state.quizGroups.length > 0) {
    state.quizGroups.forEach(function(g) {
      var count = (g.questions || []).length;
      html += '<div class="quiz-item" onclick="openQuizDreamGroupDetail(\'' + g.id + '\')" style="cursor:pointer;">';
      html += '<div class="quiz-item-text">';
      html += '<div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px;">📁 ' + escapeHtml(g.name) + '</div>';
      html += '<div style="font-size:12px;color:#86868b;">' + count + ' 条问题</div>';
      html += '</div>';
      html += '<span class="quiz-item-del" onclick="event.stopPropagation();deleteQuizDreamGroup(\'' + g.id + '\')">×</span>';
      html += '</div>';
    });
  }

  // 未归入任何分组的单题
  var groupedTexts = {};
  state.quizGroups.forEach(function(g) {
    (g.questions || []).forEach(function(q) { groupedTexts[q] = true; });
  });
  var ungrouped = state.quizQuestions.filter(function(q) { return !groupedTexts[q]; });

  if (totalSingle === 0 && totalGroups === 0) {
    html += '<div style="text-align:center;color:var(--gray);font-size:13px;padding:40px 20px;">还没有问题，点上方按钮添加吧</div>';
  } else if (ungrouped.length === 0 && totalGroups > 0) {
    html += '<div style="text-align:center;color:var(--gray);font-size:13px;padding:20px;">所有问题都已归入分组</div>';
  } else {
    ungrouped.forEach(function(q) {
      var realIdx = state.quizQuestions.indexOf(q);
      html += '<div class="quiz-item">';
      html += '<div class="quiz-item-text">' + escapeHtml(q) + '</div>';
      html += '<span class="quiz-item-del" onclick="deleteQuizQuestion(' + realIdx + ')">×</span>';
      html += '</div>';
    });
  }
  html += '</div>';
  content.innerHTML = html;
}

function openQuizDreamAddGroupModal() {
  initQuizData();
  var name = prompt('分组名称：');
  if (!name || !name.trim()) return;
  state.quizGroups.push({
    id: 'qg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    questions: []
  });
  saveState();
  renderQuizDreamTab();
  showToast('分组已创建');
}

function deleteQuizDreamGroup(gid) {
  if (!confirm('删除该分组？里面的问题会回到未分组状态。')) return;
  state.quizGroups = state.quizGroups.filter(function(g) { return g.id !== gid; });
  saveState();
  renderQuizDreamTab();
  showToast('分组已删除');
}

function openQuizDreamGroupDetail(gid) {
  window._currentQuizDreamGroupId = gid;
  var g = state.quizGroups.find(function(x) { return x.id === gid; });
  if (!g) { showToast('分组不存在'); return; }
  var titleEl = document.getElementById('quizDreamGroupTitle');
  if (titleEl) titleEl.textContent = g.name;
  renderQuizDreamGroupDetail();
  navigateTo('pageQuizDreamGroup');
}

function renderQuizDreamGroupDetail() {
  initQuizData();
  var gid = window._currentQuizDreamGroupId;
  var g = state.quizGroups.find(function(x) { return x.id === gid; });
  if (!g) { navigateTo('pageQuiz'); return; }

  var container = document.getElementById('quizDreamGroupContent');
  if (!container) return;

  var html = '';
  html += '<div style="padding:12px 16px 0;display:flex;gap:8px;">';
  html += '<button class="quiz-add-btn" onclick="openQuizDreamAddInGroup(\'' + gid + '\')" style="flex:1;margin:0;">+ 新建问题到本组</button>';
  html += '<button class="quiz-add-btn" onclick="openQuizDreamAddFromBank(\'' + gid + '\')" style="flex:1;margin:0;">+ 从题库选择</button>';
  html += '</div>';
  html += '<div style="padding:8px 16px 40px;">';
  html += '<div style="font-size:12px;color:var(--gray);margin-bottom:8px;">本组共 ' + (g.questions || []).length + ' 条</div>';

  var qs = g.questions || [];
  if (qs.length === 0) {
    html += '<div style="text-align:center;color:var(--gray);font-size:13px;padding:40px 20px;">本组还没有问题，点上方按钮添加吧</div>';
  } else {
    qs.forEach(function(text, idx) {
      html += '<div class="quiz-item">';
      html += '<div class="quiz-item-text">' + escapeHtml(text) + '</div>';
      html += '<span class="quiz-item-del" onclick="removeFromQuizDreamGroup(\'' + gid + '\',' + idx + ')">×</span>';
      html += '</div>';
    });
  }
  html += '</div>';
  container.innerHTML = html;
}

function removeFromQuizDreamGroup(gid, idx) {
  var g = state.quizGroups.find(function(x) { return x.id === gid; });
  if (!g || !g.questions) return;
  g.questions.splice(idx, 1);
  saveState();
  renderQuizDreamGroupDetail();
  showToast('已移出分组');
}

function openQuizDreamAddInGroup(gid) {
  window._quizDreamAddTargetGroup = gid;
  window._quizAddTab = 'single';
  var m = document.getElementById('quizAddModal');
  if (!m) return;
  document.getElementById('quizAddSingleInput').value = '';
  document.getElementById('quizAddBatchInput').value = '';
  switchQuizAddTab('single');
  m.classList.add('show');
  setTimeout(function() { document.getElementById('quizAddSingleInput').focus(); }, 100);
}

function openQuizDreamAddFromBank(gid) {
  initQuizData();
  var g = state.quizGroups.find(function(x) { return x.id === gid; });
  if (!g) return;

  var groupedTexts = {};
  state.quizGroups.forEach(function(gg) {
    (gg.questions || []).forEach(function(q) { groupedTexts[q] = true; });
  });
  var available = state.quizQuestions.filter(function(q) { return !groupedTexts[q]; });

  if (available.length === 0) {
    showToast('没有可添加的问题，请先去主页添加');
    return;
  }

  var lines = available.map(function(q, i) { return (i+1) + '. ' + q; });
  var msg = '输入要加入本组的问题编号（多个用逗号分隔）：\n\n' + lines.join('\n');
  var choice = prompt(msg);
  if (!choice) return;

  var nums = choice.split(/[,，\s]+/).map(function(s) { return parseInt(s); }).filter(function(n) { return !isNaN(n) && n >= 1 && n <= available.length; });
  if (nums.length === 0) { showToast('未选择'); return; }

  if (!g.questions) g.questions = [];
  nums.forEach(function(n) {
    var q = available[n-1];
    if (q && g.questions.indexOf(q) === -1) g.questions.push(q);
  });
  saveState();
  renderQuizDreamGroupDetail();
  showToast('已加入 ' + nums.length + ' 条');
}

function deleteQuizQuestion(idx) {
  if (!state.quizQuestions || idx < 0 || idx >= state.quizQuestions.length) return;
  var removed = state.quizQuestions[idx];
  state.quizQuestions.splice(idx, 1);
  state.quizGroups.forEach(function(g) {
    if (g.questions) {
      g.questions = g.questions.filter(function(q) { return q !== removed; });
    }
  });
  saveState();
  renderQuizDreamTab();
  showToast('已删除');
}

// ===== 添加问题弹窗 =====
function openQuizAddModal() {
  window._quizAddTab = 'single';
  var m = document.getElementById('quizAddModal');
  if (!m) return;
  document.getElementById('quizAddSingleInput').value = '';
  document.getElementById('quizAddBatchInput').value = '';
  switchQuizAddTab('single');
  m.classList.add('show');
  setTimeout(function() { document.getElementById('quizAddSingleInput').focus(); }, 100);
}

function closeQuizAddModal() {
  var m = document.getElementById('quizAddModal');
  if (m) m.classList.remove('show');
}

function switchQuizAddTab(tab) {
  window._quizAddTab = tab;
  var single = document.getElementById('quizAddTabSingle');
  var batch = document.getElementById('quizAddTabBatch');
  var singleInp = document.getElementById('quizAddSingleInput');
  var batchInp = document.getElementById('quizAddBatchInput');
  if (!single) return;
  if (tab === 'single') {
    single.style.background = '#007aff'; single.style.color = '#fff';
    batch.style.background = '#f0f0f5'; batch.style.color = '#555';
    singleInp.style.display = 'block';
    batchInp.style.display = 'none';
  } else {
    batch.style.background = '#007aff'; batch.style.color = '#fff';
    single.style.background = '#f0f0f5'; single.style.color = '#555';
    singleInp.style.display = 'none';
    batchInp.style.display = 'block';
  }
}

function confirmQuizAdd() {
  initQuizData();
  var targetGid = window._quizDreamAddTargetGroup || null;

  function saveToGroup(items) {
    var added = 0;
    items.forEach(function(text) {
      if (state.quizQuestions.indexOf(text) === -1) {
        state.quizQuestions.push(text);
      }
      if (targetGid) {
        var g = state.quizGroups.find(function(x) { return x.id === targetGid; });
        if (g) {
          if (!g.questions) g.questions = [];
          if (g.questions.indexOf(text) === -1) g.questions.push(text);
        }
      }
      added++;
    });
    return added;
  }

  if (window._quizAddTab === 'single') {
    var v = (document.getElementById('quizAddSingleInput').value || '').trim();
    if (!v) { showToast('请输入问题'); return; }
    if (!targetGid && state.quizQuestions.indexOf(v) > -1) { showToast('问题已存在'); return; }
    if (targetGid) {
      var g0 = state.quizGroups.find(function(x) { return x.id === targetGid; });
      if (g0 && (g0.questions || []).indexOf(v) > -1) { showToast('该组已有此问题'); return; }
    }
    saveToGroup([v]);
    saveState();
    closeQuizAddModal();
    window._quizDreamAddTargetGroup = null;
    if (document.getElementById('pageQuizDreamGroup').classList.contains('active')) {
      renderQuizDreamGroupDetail();
    } else {
      renderQuizDreamTab();
    }
    showToast('已添加');
  } else {
    var raw = document.getElementById('quizAddBatchInput').value || '';
    var lines = raw.split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s; });
    if (lines.length === 0) { showToast('请输入问题'); return; }
    var added = saveToGroup(lines);
    saveState();
    closeQuizAddModal();
    window._quizDreamAddTargetGroup = null;
    if (document.getElementById('pageQuizDreamGroup').classList.contains('active')) {
      renderQuizDreamGroupDetail();
    } else {
      renderQuizDreamTab();
    }
    showToast('已添加 ' + added + ' 条');
  }
}

// ===== 梦角主动发问卷（在 dreamReply 里调用） =====
function maybeSendQuizQuestion(senderId) {
  initQuizData();
  if (Math.random() > 0.05) return;

  // 计算可用单题（未归入任何分组）和可用分组
  var groupedTexts = {};
  state.quizGroups.forEach(function(g) {
    (g.questions || []).forEach(function(q) { groupedTexts[q] = true; });
  });
  var singlesPool = state.quizQuestions.filter(function(q) { return !groupedTexts[q]; });
  var validGroups = state.quizGroups.filter(function(g) {
    return g.questions && g.questions.length > 0;
  });

  var hasSingles = singlesPool.length > 0;
  var hasGroups = validGroups.length > 0;
  if (!hasSingles && !hasGroups) return;

  var picked = [];
  var sourceType = 'single';
  var sourceGroupName = '';

  if (hasSingles && hasGroups) {
    // 都有：50% 抽单题，50% 抽分组
    if (Math.random() < 0.5) {
      var count = 1 + Math.floor(Math.random() * Math.min(5, singlesPool.length));
      var pool = singlesPool.slice().sort(function() { return Math.random() - 0.5; });
      picked = pool.slice(0, count);
    } else {
      var g = validGroups[Math.floor(Math.random() * validGroups.length)];
      picked = g.questions.slice();
      sourceType = 'group';
      sourceGroupName = g.name;
    }
  } else if (hasSingles) {
    // 只有单题
    var count2 = 1 + Math.floor(Math.random() * Math.min(5, singlesPool.length));
    var pool2 = singlesPool.slice().sort(function() { return Math.random() - 0.5; });
    picked = pool2.slice(0, count2);
  } else {
    // 只有分组
    var g2 = validGroups[Math.floor(Math.random() * validGroups.length)];
    picked = g2.questions.slice();
    sourceType = 'group';
    sourceGroupName = g2.name;
  }

  if (picked.length === 0) return;

  // 确定提问者
  var askerId = senderId;
  var askerName = '梦角';
  if (!askerId && state.currentChatId && !state.currentChatId.startsWith('group_')) {
    askerId = state.currentChatId;
  }
  if (askerId) {
    var d = state.dreams.find(function(x) { return x.id === askerId; });
    if (d) askerName = d.name;
  }

  var packetId = 'qz_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  var packet = {
    from: 'dream',
    type: 'quiz',
    packetId: packetId,
    askerId: askerId || 'dream',
    askerName: askerName,
    answererId: 'user',
    questions: picked.slice(),
    answers: null,
    read: false,
    time: Date.now(),
    sourceType: sourceType,
    sourceGroupName: sourceGroupName
  };

  chatMessages.push(packet);
  renderChatMessages();
  saveChatMessages();
}

// ===== 打开作答弹窗 =====
function openQuizAnswerModal(packetId) {
  var packet = findQuizPacket(packetId);
  if (!packet) return;
  // 如果是「我提问」的问卷 → 直接打开查看
  if (packet.isMeAsk) {
    openQuizViewModal(packetId);
    return;
  }
  if (packet.answers && packet.answers.length > 0) {
    // 已作答 → 打开查看
    openQuizViewModal(packetId);
    return;
  }
  if (packet.answererId !== 'user') return;

  window._quizCurrentPacketId = packetId;
  var body = document.getElementById('quizAnswerBody');
  var html = '';
  packet.questions.forEach(function(q, i) {
    html += '<div class="quiz-q-block">';
    html += '<div class="quiz-q-title">Q' + (i + 1) + '. ' + escapeHtml(q) + '</div>';
    html += '<textarea class="quiz-ans-input" id="quizAns_' + i + '" placeholder="写下你的回答"></textarea>';
    html += '</div>';
  });
  body.innerHTML = html;
  document.getElementById('quizAnswerModal').classList.add('show');
}

function closeQuizAnswerModal() {
  document.getElementById('quizAnswerModal').classList.remove('show');
  window._quizCurrentPacketId = null;
}

function submitQuizAnswer() {
  var packetId = window._quizCurrentPacketId;
  if (!packetId) return;
  var packet = findQuizPacket(packetId);
  if (!packet) return;

  var answers = [];
  for (var i = 0; i < packet.questions.length; i++) {
    var el = document.getElementById('quizAns_' + i);
    answers.push(((el && el.value) || '').trim());
  }
  packet.answers = answers;

  // 找到聊天里这条消息的索引，替换答案
  var idx = chatMessages.indexOf(packet);
  if (idx > -1) {
    chatMessages[idx] = packet;
  }
  saveChatMessages();

  closeQuizAnswerModal();
  renderChatMessages();

  // 自动保存到历史记录
  saveQuizHistory(packet);

  // 延迟模拟梦角阅读
  var delay = 3000 + Math.random() * 5000;
  setTimeout(function() {
    if (state.currentChatId && state.chatSessions[state.currentChatId]) {
      var readMsg = { from: 'system', text: '「' + packet.askerName + '」已阅读问卷', time: Date.now() };
      state.chatSessions[state.currentChatId].push(readMsg);
      saveState();
      if (chatMessages.length > 0 || true) {
        loadChatMessages();
        renderChatMessages();
      }
    }
  }, delay);
}

function saveQuizHistory(packet) {
  initQuizData();
  state.quizHistory.push({
    id: packet.packetId,
    type: 'dream_ask',
    askerId: packet.askerId,
    askerName: packet.askerName,
    answererId: packet.answererId,
    answererName: state.profile.name || '我',
    questions: packet.questions.slice(),
    answers: packet.answers ? packet.answers.slice() : [],
    time: Date.now()
  });
  saveState();
}

function findQuizPacket(packetId) {
  // 先在当前 chatMessages 里找
  for (var i = 0; i < chatMessages.length; i++) {
    if (chatMessages[i] && chatMessages[i].type === 'quiz' && chatMessages[i].packetId === packetId) {
      return chatMessages[i];
    }
  }
  // 再从所有 chatSessions 里找
  for (var cid in state.chatSessions) {
    var msgs = state.chatSessions[cid];
    if (!Array.isArray(msgs)) continue;
    for (var j = 0; j < msgs.length; j++) {
      if (msgs[j] && msgs[j].type === 'quiz' && msgs[j].packetId === packetId) {
        return msgs[j];
      }
    }
  }
  return null;
}

// ===== 查看已答问卷 =====
function openQuizViewModal(packetId) {
  var packet = findQuizPacket(packetId);
  if (!packet) return;
  var body = document.getElementById('quizViewBody');
  var html = '';
  packet.questions.forEach(function(q, i) {
    var qText = '';
    var qOptions = null;
    if (typeof q === 'string') {
      qText = q;
    } else if (q && typeof q === 'object') {
      qText = q.question || '';
      qOptions = q.options || null;
    }
    html += '<div class="quiz-q-block">';
    html += '<div class="quiz-q-title">Q' + (i + 1) + '. ' + escapeHtml(qText) + '</div>';
    if (qOptions && qOptions.length > 0) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">';
      qOptions.forEach(function(opt) {
        html += '<span style="font-size:12px;padding:3px 10px;border-radius:10px;background:#f0f0f5;color:#555;">' + escapeHtml(opt) + '</span>';
      });
      html += '</div>';
    }
    var ansVal = (packet.answers && packet.answers[i]) ? packet.answers[i] : '';
    if (ansVal) {
      html += '<div style="padding:10px 12px;background:#f8f8fa;border-radius:10px;font-size:13px;color:#1d1d1f;line-height:1.5;">' + escapeHtml(ansVal) + '</div>';
    } else {
      html += '<div style="padding:10px 12px;background:#f8f8fa;border-radius:10px;font-size:13px;color:#bbb;">未作答</div>';
    }
    html += '</div>';
  });
  body.innerHTML = html;
  document.getElementById('quizViewModal').classList.add('show');
}

function closeQuizViewModal() {
  document.getElementById('quizViewModal').classList.remove('show');
}

// ===== 历史记录 Tab =====
window._quizHistoryEdit = false;
window._quizHistorySelected = [];

function renderQuizHistoryTab() {
  initQuizData();
  var content = document.getElementById('quizTabContent');
  if (!content) return;

  var sorted = state.quizHistory.slice().sort(function(a, b) { return b.time - a.time; });

  var html = '';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px 8px;">';
  html += '<span style="font-size:13px;color:var(--gray);">共 ' + sorted.length + ' 条</span>';
  html += '<button onclick="toggleQuizHistoryEdit()" style="padding:6px 14px;border:1px solid var(--border);background:var(--card);border-radius:14px;font-size:13px;cursor:pointer;color:' + (window._quizHistoryEdit ? 'var(--red)' : 'var(--blue)') + ';">' + (window._quizHistoryEdit ? '完成' : '编辑') + '</button>';
  html += '</div>';

  if (sorted.length === 0) {
    html += '<div style="padding:60px 20px;text-align:center;color:var(--gray);font-size:13px;">还没有问卷记录</div>';
    content.innerHTML = html;
    return;
  }

  html += '<div style="padding:0 0 80px;">';
  sorted.forEach(function(h) {
    var t = new Date(h.time);
    var timeStr = t.getFullYear() + '/' +
      String(t.getMonth() + 1).padStart(2, '0') + '/' +
      String(t.getDate()).padStart(2, '0') + ' ' +
      String(t.getHours()).padStart(2, '0') + ':' +
      String(t.getMinutes()).padStart(2, '0');

    var selected = window._quizHistorySelected.indexOf(h.id) > -1;
    var whoLine = '';
    if (h.type === 'dream_ask') {
      whoLine = h.askerName + ' 提问 · ' + h.answererName + ' 回答';
    } else {
      whoLine = h.askerName + ' 提问 · ' + h.answererName + ' 回答';
    }
    var preview = '';
    if (h.questions && h.questions.length > 0) {
      var q0 = h.questions[0];
      if (typeof q0 === 'string') preview = q0;
      else if (q0 && q0.question) preview = q0.question;
      if (h.questions.length > 1) preview += ' …（共 ' + h.questions.length + ' 题）';
    }

    var click = window._quizHistoryEdit
      ? 'toggleQuizHistorySelect(\'' + h.id + '\')'
      : 'openQuizHistoryDetail(\'' + h.id + '\')';

    html += '<div class="quiz-history-item' + (selected ? ' selected' : '') + '" onclick="' + click + '" style="' + (selected ? 'background:rgba(0,122,255,0.06);' : '') + '">';
    if (window._quizHistoryEdit) {
      html += '<div class="quiz-history-check' + (selected ? ' checked' : '') + '">' + (selected ? '✓' : '') + '</div>';
    }
    html += '<div class="quiz-history-info">';
    html += '<div class="quiz-history-title">' + escapeHtml(whoLine) + '</div>';
    html += '<div class="quiz-history-time">' + timeStr + '</div>';
    html += '<div class="quiz-history-preview">' + escapeHtml(preview) + '</div>';
    html += '</div></div>';
  });
  html += '</div>';

    // 底部编辑操作栏
  var _barShow = window._quizHistoryEdit ? 'display:flex;' : 'display:none;';
  html += '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(255,255,255,0.96);border-top:1px solid #e5e5ea;padding:14px 16px 24px;box-sizing:border-box;gap:12px;z-index:30;' + _barShow + '">';
  html += '<button onclick="quizHistorySelectAll()" style="flex:1;padding:16px 10px;border-radius:14px;font-size:16px;font-weight:600;border:1px solid #e5e5ea;background:#fff;color:#1d1d1f;cursor:pointer;font-family:inherit;">全选</button>';
  html += '<button onclick="quizHistoryDeleteSelected()" style="flex:1;padding:16px 10px;border-radius:14px;font-size:16px;font-weight:600;border:none;background:rgba(255,59,48,0.9);color:#fff;cursor:pointer;font-family:inherit;">删除</button>';
  html += '<button onclick="exitQuizHistoryEdit()" style="flex:1;padding:16px 10px;border-radius:14px;font-size:16px;font-weight:600;border:1px solid #e5e5ea;background:#fff;color:#1d1d1f;cursor:pointer;font-family:inherit;">取消</button>';
  html += '</div>';

  content.innerHTML = html;
}

function toggleQuizHistoryEdit() {
  window._quizHistoryEdit = !window._quizHistoryEdit;
  if (!window._quizHistoryEdit) window._quizHistorySelected = [];
  renderQuizHistoryTab();
}

function exitQuizHistoryEdit() {
  window._quizHistoryEdit = false;
  window._quizHistorySelected = [];
  renderQuizHistoryTab();
}

function toggleQuizHistorySelect(id) {
  var idx = window._quizHistorySelected.indexOf(id);
  if (idx > -1) window._quizHistorySelected.splice(idx, 1);
  else window._quizHistorySelected.push(id);
  renderQuizHistoryTab();
}

function quizHistorySelectAll() {
  initQuizData();
  if (window._quizHistorySelected.length === state.quizHistory.length) {
    window._quizHistorySelected = [];
  } else {
    window._quizHistorySelected = state.quizHistory.map(function(h) { return h.id; });
  }
  renderQuizHistoryTab();
}

function quizHistoryDeleteSelected() {
  if (window._quizHistorySelected.length === 0) {
    showToast('请先选择记录');
    return;
  }
  if (!confirm('确定删除选中的 ' + window._quizHistorySelected.length + ' 条记录吗？')) return;
  state.quizHistory = state.quizHistory.filter(function(h) {
    return window._quizHistorySelected.indexOf(h.id) === -1;
  });
  window._quizHistorySelected = [];
  window._quizHistoryEdit = false;
  saveState();
  renderQuizHistoryTab();
  showToast('已删除');
}

// ===== 历史详情页 =====
function openQuizHistoryDetail(historyId) {
  initQuizData();
  var h = state.quizHistory.find(function(x) { return x.id === historyId; });
  if (!h) return;

  var body = document.getElementById('quizHistoryDetailBody');
  var t = new Date(h.time);
  var timeStr = t.getFullYear() + '年' +
    (t.getMonth() + 1) + '月' + t.getDate() + '日 ' +
    String(t.getHours()).padStart(2, '0') + ':' +
    String(t.getMinutes()).padStart(2, '0');

  var html = '';
  html += '<div style="padding:14px 16px;background:var(--card);border-radius:12px;margin-bottom:14px;">';
  html += '<div style="font-size:13px;color:var(--gray);margin-bottom:6px;">提问：' + escapeHtml(h.askerName) + '</div>';
  html += '<div style="font-size:13px;color:var(--gray);margin-bottom:6px;">回答：' + escapeHtml(h.answererName) + '</div>';
  html += '<div style="font-size:12px;color:#bbb;">' + timeStr + '</div>';
  html += '</div>';

  h.questions.forEach(function(q, i) {
    var qText = '';
    var qOptions = null;
    if (typeof q === 'string') {
      qText = q;
    } else if (q && typeof q === 'object') {
      qText = q.question || '';
      qOptions = q.options || null;
    }
    html += '<div class="quiz-q-block" style="background:var(--card);border-radius:12px;padding:14px 16px;">';
    html += '<div class="quiz-q-title">Q' + (i + 1) + '. ' + escapeHtml(qText) + '</div>';
    if (qOptions && qOptions.length > 0) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">';
      qOptions.forEach(function(opt) {
        html += '<span style="font-size:12px;padding:3px 10px;border-radius:10px;background:#f0f0f5;color:#555;">' + escapeHtml(opt) + '</span>';
      });
      html += '</div>';
    }
    var ansVal = (h.answers && h.answers[i]) ? h.answers[i] : '';
    if (ansVal) {
      html += '<div style="padding:10px 12px;background:#f8f8fa;border-radius:10px;font-size:13px;color:#1d1d1f;line-height:1.5;">' + escapeHtml(ansVal) + '</div>';
    } else {
      html += '<div style="padding:10px 12px;background:#f8f8fa;border-radius:10px;font-size:13px;color:#bbb;">未作答</div>';
    }
    html += '</div>';
  });

  body.innerHTML = html;
  navigateTo('pageQuizHistoryDetail');
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== 我提问 Tab =====
window._quizMeType = 'single';
window._quizMeSelected = [];
window._quizMeEditMode = false;
window._quizMePressTimer = null;

function initQuizMeData() {
  if (!state.quizMeQuestions || !Array.isArray(state.quizMeQuestions)) state.quizMeQuestions = [];
  if (!state.quizMeGroups || !Array.isArray(state.quizMeGroups)) state.quizMeGroups = [];
}

function renderQuizMeTab() {
  initQuizMeData();
  var content = document.getElementById('quizTabContent');
  if (!content) return;

  var totalSingle = state.quizMeQuestions.length;
  var totalGroups = state.quizMeGroups.length;

  var html = '';
  html += '<div style="padding:12px 16px 0;display:flex;gap:8px;">';
  html += '<button class="quiz-add-btn" onclick="openQuizMeAddModal()" style="flex:1;margin:0;">+ 添加题目</button>';
  html += '<button class="quiz-add-btn" onclick="openQuizMeAddGroupModal()" style="flex:1;margin:0;">+ 添加分组</button>';
  html += '</div>';

  html += '<div style="padding:8px 16px 100px;">';

  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
  html += '<span style="font-size:12px;color:var(--gray);">当前题库：' + totalSingle + ' 题 · ' + totalGroups + ' 组</span>';
  html += '<button onclick="toggleQuizMeSelect()" style="padding:4px 14px;border:1px solid var(--border);background:var(--card);border-radius:14px;font-size:12px;cursor:pointer;color:' + (window._quizMeSelectMode ? 'var(--red)' : 'var(--blue)') + ';">' + (window._quizMeSelectMode ? '取消' : '选择') + '</button>';
  html += '</div>';

  // 分组列表
  if (state.quizMeGroups.length > 0) {
    state.quizMeGroups.forEach(function(g) {
      var count = (g.questionIds || []).length;
      var selected = window._quizMeSelectMode && window._quizMeSelectedGroups && window._quizMeSelectedGroups.indexOf(g.id) > -1;
      var clickAction = window._quizMeSelectMode
        ? 'toggleQuizMeGroupSelect(\'' + g.id + '\')'
        : 'openQuizMeGroupDetail(\'' + g.id + '\')';
      html += '<div class="quiz-item" onclick="' + clickAction + '" style="' + (selected ? 'background:rgba(0,122,255,0.08);border-color:var(--blue);' : '') + 'cursor:pointer;">';
      html += '<div class="quiz-item-text">';
      html += '<div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px;">📁 ' + escapeHtml(g.name) + '</div>';
      html += '<div style="font-size:12px;color:#86868b;">' + count + ' 道题</div>';
      html += '</div>';
      html += '<span class="quiz-item-del" onclick="event.stopPropagation();deleteQuizMeGroup(\'' + g.id + '\')">×</span>';
      html += '</div>';
    });
  }

  // 单题列表（未归入任何分组的题）
  var groupedIds = {};
  state.quizMeGroups.forEach(function(g) {
    (g.questionIds || []).forEach(function(id) { groupedIds[id] = true; });
  });
  var ungrouped = state.quizMeQuestions.filter(function(q) { return !groupedIds[q.id]; });

  if (totalSingle === 0 && totalGroups === 0) {
    html += '<div style="text-align:center;color:var(--gray);font-size:13px;padding:40px 20px;">还没有题目，点上方按钮添加吧</div>';
  } else if (ungrouped.length === 0 && totalGroups > 0) {
    html += '<div style="text-align:center;color:var(--gray);font-size:13px;padding:20px;">所有题目都已归入分组</div>';
  } else {
    ungrouped.forEach(function(q) {
      var realIdx = state.quizMeQuestions.indexOf(q);
      var selected = window._quizMeSelectMode && window._quizMeSelected && window._quizMeSelected.indexOf(q.id) > -1;
      var clickAction = window._quizMeSelectMode
        ? 'toggleQuizMeQuestionSelect(\'' + q.id + '\')'
        : '';
      html += '<div class="quiz-item" onclick="' + clickAction + '" style="' + (selected ? 'background:rgba(0,122,255,0.08);border-color:var(--blue);' : '') + (window._quizMeSelectMode ? 'cursor:pointer;' : '') + '">';
      html += '<div class="quiz-item-text">';
      html += '<div style="font-size:13px;color:var(--gray);margin-bottom:4px;">' + (q.type === 'multi' ? '【多选】' : '【单选】') + '</div>';
      html += escapeHtml(q.question);
      html += '<div style="font-size:12px;color:#86868b;margin-top:6px;">选项：' + q.options.map(function(o){ return escapeHtml(o); }).join(' / ') + '</div>';
      html += '</div>';
      html += '<span class="quiz-item-del" onclick="event.stopPropagation();deleteQuizMeQuestion(' + realIdx + ')">×</span>';
      html += '</div>';
    });
  }
  html += '</div>';

  content.innerHTML = html;

  // 底部按钮条
  var _oldBar = document.getElementById('quizFixedBar');
  if (_oldBar) _oldBar.remove();
  var selCount = ((window._quizMeSelected && window._quizMeSelected.length) || 0) + ((window._quizMeSelectedGroups && window._quizMeSelectedGroups.length) || 0);
  if (window._quizMeSelectMode && selCount > 0) {
    var _bar = document.createElement('div');
    _bar.id = 'quizFixedBar';
    _bar.className = 'quiz-bar show';
    var _btnGroup = '';
    if ((window._quizMeSelected && window._quizMeSelected.length) > 0) {
      _btnGroup = '<button class="btn-all" onclick="promptGroupForSelected()">归入分组</button>';
    }
    _bar.innerHTML = '<button class="btn-cancel" onclick="exitQuizMeSelect()">取消</button>' + _btnGroup + '<button class="btn-del" onclick="confirmQuizMeSend()" style="background:rgba(0,122,255,0.85);">发送（' + selCount + '）</button>';
    var _quizPage = document.getElementById('pageQuiz');
    if (_quizPage) _quizPage.appendChild(_bar);
  }
}

window._quizMeSelectMode = false;
window._quizMeSelected = [];
window._quizMeSelectedGroups = [];

function toggleQuizMeSelect() {
  window._quizMeSelectMode = !window._quizMeSelectMode;
  if (!window._quizMeSelectMode) {
    window._quizMeSelected = [];
    window._quizMeSelectedGroups = [];
  }
  renderQuizMeTab();
}

function toggleQuizMeGroupSelect(gid) {
  if (!window._quizMeSelectedGroups) window._quizMeSelectedGroups = [];
  var pos = window._quizMeSelectedGroups.indexOf(gid);
  if (pos > -1) window._quizMeSelectedGroups.splice(pos, 1);
  else window._quizMeSelectedGroups.push(gid);
  renderQuizMeTab();
}

function toggleQuizMeQuestionSelect(qid) {
  if (!window._quizMeSelected) window._quizMeSelected = [];
  var pos = window._quizMeSelected.indexOf(qid);
  if (pos > -1) window._quizMeSelected.splice(pos, 1);
  else window._quizMeSelected.push(qid);
  renderQuizMeTab();
}

function exitQuizMeSelect() {
  window._quizMeSelectMode = false;
  window._quizMeSelected = [];
  window._quizMeSelectedGroups = [];
  renderQuizMeTab();
}

function openQuizMeAddGroupModal() {
  initQuizMeData();
  var name = prompt('分组名称：');
  if (!name || !name.trim()) return;
  state.quizMeGroups.push({
    id: 'qmg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    questionIds: []
  });
  saveState();
  renderQuizMeTab();
  showToast('分组已创建');
}

function openQuizMeAddModalInGroup(gid) {
  window._quizMeAddTargetGroup = gid;
  window._quizMeType = 'single';
  document.getElementById('quizMeQInput').value = '';
  document.getElementById('quizMeOptionsContainer').innerHTML = '';
  addQuizMeOption();
  addQuizMeOption();
  switchQuizMeType('single');
  document.getElementById('quizMeAddModal').classList.add('show');
}

function openQuizMeAddFromBankModal(gid) {
  initQuizMeData();
  var g = state.quizMeGroups.find(function(x) { return x.id === gid; });
  if (!g) return;

  var grouped = {};
  state.quizMeGroups.forEach(function(gg) {
    (gg.questionIds || []).forEach(function(id) { grouped[id] = true; });
  });
  var available = state.quizMeQuestions.filter(function(q) { return !grouped[q.id]; });

  if (available.length === 0) {
    showToast('没有可添加的题目，请先去主页添加');
    return;
  }

  var lines = available.map(function(q, i) { return (i+1) + '. ' + q.question; });
  var msg = '输入要加入本组的问题编号（多个用逗号分隔）：\n\n' + lines.join('\n');
  var choice = prompt(msg);
  if (!choice) return;

  var nums = choice.split(/[,，\s]+/).map(function(s) { return parseInt(s); }).filter(function(n) { return !isNaN(n) && n >= 1 && n <= available.length; });
  if (nums.length === 0) { showToast('未选择'); return; }

  if (!g.questionIds) g.questionIds = [];
  nums.forEach(function(n) {
    var q = available[n-1];
    if (q && g.questionIds.indexOf(q.id) === -1) g.questionIds.push(q.id);
  });
  saveState();
  renderQuizMeGroupDetail();
  showToast('已加入 ' + nums.length + ' 道题');
}

function promptGroupForSelected() {
  var selCount = (window._quizMeSelected && window._quizMeSelected.length) || 0;
  if (selCount === 0) { showToast('请先选择题目'); return; }

  var options = ['【新建分组】'];
  state.quizMeGroups.forEach(function(g) {
    options.push('【已有】' + g.name);
  });
  var msg = '把选中的 ' + selCount + ' 道题归入哪里？\n\n';
  options.forEach(function(o, i) { msg += (i+1) + '. ' + o + '\n'; });
  var choice = prompt(msg, '1');
  if (!choice) return;
  var idx = parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= options.length) { showToast('选择无效'); return; }

  var targetGid;
  if (idx === 0) {
    var name = prompt('新分组名称：');
    if (!name || !name.trim()) return;
    targetGid = 'qmg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    state.quizMeGroups.push({ id: targetGid, name: name.trim(), questionIds: [] });
  } else {
    targetGid = state.quizMeGroups[idx - 1].id;
  }

  var g = state.quizMeGroups.find(function(x) { return x.id === targetGid; });
  if (!g) return;
  if (!g.questionIds) g.questionIds = [];
  window._quizMeSelected.forEach(function(qid) {
    if (g.questionIds.indexOf(qid) === -1) g.questionIds.push(qid);
  });

  saveState();
  window._quizMeSelected = [];
  window._quizMeSelectedGroups = [];
  window._quizMeSelectMode = false;
  renderQuizMeTab();
  showToast('已归入分组');
}

function deleteQuizMeGroup(gid) {
  if (!confirm('删除该分组？里面的题目会回到未分组状态。')) return;
  state.quizMeGroups = state.quizMeGroups.filter(function(g) { return g.id !== gid; });
  saveState();
  renderQuizMeTab();
  showToast('分组已删除');
}

function openQuizMeGroupDetail(gid) {
  window._currentQuizMeGroupId = gid;
  var g = state.quizMeGroups.find(function(x) { return x.id === gid; });
  if (!g) { showToast('分组不存在'); return; }
  var titleEl = document.getElementById('quizMeGroupTitle');
  if (titleEl) titleEl.textContent = g.name;
  renderQuizMeGroupDetail();
  navigateTo('pageQuizMeGroup');
}

function renderQuizMeGroupDetail() {
  initQuizMeData();
  var gid = window._currentQuizMeGroupId;
  var g = state.quizMeGroups.find(function(x) { return x.id === gid; });
  if (!g) { navigateTo('pageQuiz'); return; }

  var container = document.getElementById('quizMeGroupContent');
  if (!container) return;

  var html = '';
  html += '<div style="padding:12px 16px 0;display:flex;gap:8px;">';
  html += '<button class="quiz-add-btn" onclick="openQuizMeAddModalInGroup(\'' + gid + '\')" style="flex:1;margin:0;">+ 新建题目到本组</button>';
  html += '<button class="quiz-add-btn" onclick="openQuizMeAddFromBankModal(\'' + gid + '\')" style="flex:1;margin:0;">+ 从题库选择</button>';
  html += '</div>';
  html += '<div style="padding:8px 16px 40px;">';
  html += '<div style="font-size:12px;color:var(--gray);margin-bottom:8px;">本组共 ' + (g.questionIds || []).length + ' 道题</div>';

  var ids = g.questionIds || [];
  if (ids.length === 0) {
    html += '<div style="text-align:center;color:var(--gray);font-size:13px;padding:40px 20px;">本组还没有题目，点上方按钮添加吧</div>';
  } else {
    ids.forEach(function(qid) {
      var q = state.quizMeQuestions.find(function(x) { return x.id === qid; });
      if (!q) return;
      html += '<div class="quiz-item">';
      html += '<div class="quiz-item-text">';
      html += '<div style="font-size:13px;color:var(--gray);margin-bottom:4px;">' + (q.type === 'multi' ? '【多选】' : '【单选】') + '</div>';
      html += escapeHtml(q.question);
      html += '<div style="font-size:12px;color:#86868b;margin-top:6px;">选项：' + q.options.map(function(o){ return escapeHtml(o); }).join(' / ') + '</div>';
      html += '</div>';
      html += '<span class="quiz-item-del" onclick="removeQuestionFromQuizMeGroup(\'' + gid + '\',\'' + qid + '\')">×</span>';
      html += '</div>';
    });
  }
  html += '</div>';
  container.innerHTML = html;
}

function removeQuestionFromQuizMeGroup(gid, qid) {
  var g = state.quizMeGroups.find(function(x) { return x.id === gid; });
  if (!g || !g.questionIds) return;
  g.questionIds = g.questionIds.filter(function(id) { return id !== qid; });
  saveState();
  renderQuizMeGroupDetail();
  showToast('已移出分组');
}

function confirmQuizMeSend() {
  var selCount = ((window._quizMeSelected && window._quizMeSelected.length) || 0) + ((window._quizMeSelectedGroups && window._quizMeSelectedGroups.length) || 0);
  if (selCount === 0) { showToast('请先选择题库'); return; }
  openQuizSendModal();
}

function bindQuizMeLongPress() {
  var items = document.querySelectorAll('[data-quiz-me-idx]');
  items.forEach(function(el) {
    var idx = parseInt(el.dataset.quizMeIdx);

    function start(e) {
      clearTimeout(window._quizMePressTimer);
      window._quizMePressTimer = setTimeout(function() {
        var pos = window._quizMeSelected.indexOf(idx);
        if (pos === -1) window._quizMeSelected.push(idx);
        else window._quizMeSelected.splice(pos, 1);
        if (navigator.vibrate) navigator.vibrate(30);
        renderQuizMeTab();
      }, 800);
    }
    function cancel() { clearTimeout(window._quizMePressTimer); }

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchmove', cancel);
    el.addEventListener('touchcancel', cancel);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
  });
}

function deleteQuizMeQuestion(idx) {
  if (!state.quizMeQuestions || idx < 0 || idx >= state.quizMeQuestions.length) return;
  var removed = state.quizMeQuestions[idx];
  state.quizMeQuestions.splice(idx, 1);
  state.quizMeGroups.forEach(function(g) {
    if (g.questionIds) {
      g.questionIds = g.questionIds.filter(function(id) { return id !== removed.id; });
    }
  });
  window._quizMeSelected = [];
  saveState();
  renderQuizMeTab();
  showToast('已删除');
}

// ===== 添加题目弹窗 =====
function openQuizMeAddModal() {
  window._quizMeType = 'single';
  document.getElementById('quizMeQInput').value = '';
  document.getElementById('quizMeOptionsContainer').innerHTML = '';
  addQuizMeOption();
  addQuizMeOption();
  switchQuizMeType('single');
  document.getElementById('quizMeAddModal').classList.add('show');
}

function closeQuizMeAddModal() {
  document.getElementById('quizMeAddModal').classList.remove('show');
}

function switchQuizMeType(type) {
  window._quizMeType = type;
  var single = document.getElementById('quizMeTypeSingle');
  var multi = document.getElementById('quizMeTypeMulti');
  if (!single) return;
  if (type === 'single') {
    single.style.background = '#007aff'; single.style.color = '#fff';
    multi.style.background = '#f0f0f5'; multi.style.color = '#555';
  } else {
    multi.style.background = '#007aff'; multi.style.color = '#fff';
    single.style.background = '#f0f0f5'; single.style.color = '#555';
  }
}

function addQuizMeOption() {
  var container = document.getElementById('quizMeOptionsContainer');
  var count = container.querySelectorAll('.quiz-opt-row').length;
  if (count >= 10) { showToast('最多 10 个选项'); return; }
  var row = document.createElement('div');
  row.className = 'quiz-opt-row';
  row.innerHTML = '<input type="text" placeholder="选项 ' + (count + 1) + '"><span class="quiz-opt-del">×</span>';
  container.appendChild(row);
  row.querySelector('.quiz-opt-del').onclick = function() {
    if (container.querySelectorAll('.quiz-opt-row').length <= 2) {
      showToast('至少保留 2 个选项'); return;
    }
    row.remove();
  };
}

function confirmQuizMeAdd() {
  var q = (document.getElementById('quizMeQInput').value || '').trim();
  if (!q) { showToast('请输入题目'); return; }
  var rows = document.querySelectorAll('#quizMeOptionsContainer .quiz-opt-row');
  var options = [];
  rows.forEach(function(r) {
    var v = (r.querySelector('input').value || '').trim();
    if (v) options.push(v);
  });
  if (options.length < 2) { showToast('至少 2 个选项'); return; }

  initQuizMeData();
  var newId = 'qm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  state.quizMeQuestions.push({
    id: newId,
    question: q,
    type: window._quizMeType,
    options: options
  });

  var targetGid = window._quizMeAddTargetGroup;
  if (targetGid) {
    var g = state.quizMeGroups.find(function(x) { return x.id === targetGid; });
    if (g) {
      if (!g.questionIds) g.questionIds = [];
      g.questionIds.push(newId);
    }
    window._quizMeAddTargetGroup = null;
  }

  saveState();
  closeQuizMeAddModal();
  if (document.getElementById('pageQuizMeGroup').classList.contains('active')) {
    renderQuizMeGroupDetail();
  } else {
    renderQuizMeTab();
  }
  showToast('已保存');
}

// ===== 发送给梦角 =====
function openQuizSendModal() {
  var body = document.getElementById('quizSendBody');
  var html = '';
  if (!state.dreams || state.dreams.length === 0) {
    html = '<div style="padding:20px;text-align:center;color:#999;">还没有梦角</div>';
  } else {
    state.dreams.forEach(function(d) {
      var av = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%2720%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2720%27 y=%2725%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2716%27%3E💜%3C/text%3E%3C/svg%3E';
      html += '<div onclick="sendQuizMeTo(\'' + d.id + '\')" style="display:flex;align-items:center;padding:12px;border-radius:12px;background:#f8f8fa;margin-bottom:8px;cursor:pointer;">';
      html += '<img src="' + av + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;margin-right:12px;">';
      html += '<span style="font-size:15px;color:#1d1d1f;">' + d.name + '</span>';
      html += '</div>';
    });
  }
  body.innerHTML = html;
  document.getElementById('quizSendModal').classList.add('show');
}

function closeQuizSendModal() {
  document.getElementById('quizSendModal').classList.remove('show');
}

function sendQuizMeTo(dreamId) {
  var selSingle = window._quizMeSelected || [];
  var selGroups = window._quizMeSelectedGroups || [];
  if (selSingle.length === 0 && selGroups.length === 0) { closeQuizSendModal(); return; }
  var dream = state.dreams.find(function(x) { return x.id === dreamId; });
  if (!dream) return;

  // 收集题目：单题 + 分组内全部题目，合并去重
  var qidSet = {};
  selSingle.forEach(function(qid) { qidSet[qid] = true; });
  selGroups.forEach(function(gid) {
    var g = state.quizMeGroups.find(function(x) { return x.id === gid; });
    if (!g) return;
    (g.questionIds || []).forEach(function(qid) { qidSet[qid] = true; });
  });

  var picked = Object.keys(qidSet).map(function(qid) {
    var q = state.quizMeQuestions.find(function(x) { return x.id === qid; });
    if (!q) return null;
    return { id: q.id, question: q.question, type: q.type, options: q.options.slice() };
  }).filter(function(x) { return x; });

  // 切换到和这个梦角的聊天
  saveChatMessages();
  if (!state.chatSessions[dreamId]) state.chatSessions[dreamId] = [];
  state.currentChatId = dreamId;

  var packetId = 'qzm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  var packet = {
    from: 'user',
    type: 'quiz',
    packetId: packetId,
    askerId: 'user',
    askerName: state.profile.name || '我',
    answererId: dreamId,
    questions: picked,
    answers: null,
    read: false,
    time: Date.now(),
    isMeAsk: true
  };
  state.chatSessions[dreamId].push(packet);
  saveState();

  window._quizMeSelected = [];
  closeQuizSendModal();
  loadChatMessages();
  renderChat();
  navigateTo('pagePrivateChat');
  showToast('已发送给「' + dream.name + '」');

  // 梦角决定
  setTimeout(function() {
    var roll = Math.random();
    if (roll < 0.9) {
      // 回答 → 30-300 秒
      var delay = 30000 + Math.random() * 270000;
      setTimeout(function() { quizMeDreamAnswer(packetId, dreamId); }, delay);
    } else {
      // 拒绝
      setTimeout(function() {
        if (!state.chatSessions[dreamId]) return;
        state.chatSessions[dreamId].push({ from: 'system', text: '「' + dream.name + '」拒绝了回答问题', time: Date.now() });
        saveState();
        if (state.currentChatId === dreamId) {
          loadChatMessages();
          renderChatMessages();
        }
      }, 5000 + Math.random() * 5000);
    }
  }, 1000);
}

function quizMeDreamAnswer(packetId, dreamId) {
  var msgs = state.chatSessions[dreamId] || [];
  var packet = null;
  for (var i = 0; i < msgs.length; i++) {
    if (msgs[i] && msgs[i].type === 'quiz' && msgs[i].packetId === packetId) {
      packet = msgs[i]; break;
    }
  }
  if (!packet) return;
  if (packet.answers && packet.answers.length > 0) return;

  var dream = state.dreams.find(function(x) { return x.id === dreamId; });
  var dreamName = dream ? dream.name : '梦角';

  // 生成答案
  var answers = packet.questions.map(function(q) {
    if (q.type === 'single') {
      return q.options[Math.floor(Math.random() * q.options.length)];
    } else {
      // 多选：随机 1 到 N 个
      var n = 1 + Math.floor(Math.random() * q.options.length);
      var pool = q.options.slice().sort(function() { return Math.random() - 0.5; });
      return pool.slice(0, n).join('、');
    }
  });
  packet.answers = answers;
  packet.answererName = dreamName;
  packet.answererId = dreamId;
  saveState();

  // 在聊天里加一条系统小字
  if (!state.chatSessions[dreamId]) state.chatSessions[dreamId] = [];
  state.chatSessions[dreamId].push({
    from: 'system',
    text: '「' + dreamName + '」已回答问卷',
    time: Date.now()
  });
  saveState();

  if (state.currentChatId === dreamId) {
    loadChatMessages();
    renderChatMessages();
  }

  sendNotification(dreamName, '已回答你的问卷');

  // 存历史
  initQuizData();
  state.quizHistory.push({
    id: packetId,
    type: 'me_ask',
    askerId: 'user',
    askerName: state.profile.name || '我',
    answererId: dreamId,
    answererName: dreamName,
    questions: packet.questions.slice(),
    answers: answers.slice(),
    time: Date.now()
  });
  saveState();
}

// ===== 我提问：查看已答问卷 =====
function openQuizMeViewModal(packetId) {
  openQuizViewModal(packetId);
}

// ===== 备忘录系统 =====
window._memoEditId = null;
window._memoSelectedDreams = [];

function initMemoData() {
  if (!state.memos || !Array.isArray(state.memos)) state.memos = [];
}

function renderMemoList() {
  initMemoData();
  var container = document.getElementById('memoListContainer');
  if (!container) return;

  if (state.memos.length === 0) {
    container.innerHTML = '<div class="memo-empty">还没有备忘录<br>点右上角 + 新建一条吧</div>';
    return;
  }

  var sorted = state.memos.slice().sort(function(a, b) {
    // 有提醒的排前面（按时间），无提醒的排后面
    if (a.remindEnabled && !b.remindEnabled) return -1;
    if (!a.remindEnabled && b.remindEnabled) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  var html = '';
  sorted.forEach(function(m) {
    var status = 'pending';
    var statusText = '未完成';
    var statusClass = 'pending';

    if (!m.remindEnabled) {
      statusText = '无需提醒';
      statusClass = 'none';
    } else if (m.status === 'done') {
      statusText = '已完成';
      statusClass = 'done';
    }

    var remindLine = '';
    if (m.remindEnabled && m.remindDate && m.remindTime) {
      remindLine = '⏰ ' + m.remindDate + ' ' + m.remindTime;
    }

    var preview = (m.content || '').replace(/\n/g, ' ');
    if (preview.length > 50) preview = preview.slice(0, 50) + '…';

    html += '<div class="memo-item" onclick="openMemoEdit(\'' + m.id + '\')">';
    html += '<div class="memo-item-content">' + escapeHtml(preview) + '</div>';
    if (remindLine) html += '<div class="memo-item-remind">' + remindLine + '</div>';
    html += '<div class="memo-item-foot" style="justify-content:space-between;">';
    html += '<span class="memo-status-tag ' + statusClass + '">' + statusText + '</span>';
    html += '<span onclick="event.stopPropagation();deleteMemo(\'' + m.id + '\')" style="font-size:12px;color:var(--red);cursor:pointer;padding:4px 10px;border-radius:8px;background:rgba(255,59,48,0.1);user-select:none;">删除</span>';
    html += '</div>';
    html += '</div>';
  });

  container.innerHTML = html;
}

function deleteMemo(memoId) {
  if (!confirm('确定删除这条备忘录吗？此操作不可恢复！')) return;
  initMemoData();
  state.memos = state.memos.filter(function(m) { return m.id !== memoId; });
  saveState();
  renderMemoList();
  showToast('已删除');
}

function openMemoEdit(memoId) {
  initMemoData();
  window._memoEditId = memoId;

  var memo = memoId ? state.memos.find(function(x) { return x.id === memoId; }) : null;

  document.getElementById('memoEditTitle').textContent = memo ? '编辑备忘录' : '新建备忘录';
  document.getElementById('memoContentInput').value = memo ? (memo.content || '') : '';

  var toggle = document.getElementById('memoRemindToggle');
  var settingArea = document.getElementById('memoRemindSetting');
  var remindOn = memo ? !!memo.remindEnabled : false;
  toggle.classList.toggle('on', remindOn);
  settingArea.style.display = remindOn ? 'block' : 'none';
  toggle.onclick = function() {
    var isOn = toggle.classList.toggle('on');
    settingArea.style.display = isOn ? 'block' : 'none';
  };

  // 日期和时间
  var dateInput = document.getElementById('memoDateInput');
  var timeInput = document.getElementById('memoTimeInput');
  if (memo && memo.remindDate) dateInput.value = memo.remindDate;
  else {
    var now = new Date();
    dateInput.value = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
  }
  if (memo && memo.remindTime) timeInput.value = memo.remindTime;
  else {
    var now2 = new Date();
    var hh = String(now2.getHours()).padStart(2, '0');
    var mm = String(now2.getMinutes() + 5 > 59 ? 0 : now2.getMinutes() + 5).padStart(2, '0');
    timeInput.value = hh + ':' + mm;
  }

  // 已选梦角
  window._memoSelectedDreams = memo && memo.dreamIds ? memo.dreamIds.slice() : [];

  // 渲染梦角列表
  renderMemoDreamList();

  navigateTo('pageMemoEdit');
}

function renderMemoDreamList() {
  var container = document.getElementById('memoDreamList');
  if (!container) return;
  if (!state.dreams || state.dreams.length === 0) {
    container.innerHTML = '<div style="font-size:12px;color:var(--gray);padding:8px 0;">还没有梦角</div>';
    return;
  }
  container.innerHTML = state.dreams.map(function(d) {
    var checked = window._memoSelectedDreams.indexOf(d.id) > -1;
    var av = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2736%27 height=%2736%27 viewBox=%270 0 36 36%27%3E%3Ccircle cx=%2718%27 cy=%2718%27 r=%2718%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2718%27 y=%2723%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2714%27%3E💜%3C/text%3E%3C/svg%3E';
    return '<label style="display:flex;align-items:center;padding:10px 12px;background:var(--card);border-radius:12px;border:1px solid var(--border);cursor:pointer;">' +
      '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="toggleMemoDream(\'' + d.id + '\',this.checked)" style="width:18px;height:18px;margin-right:10px;accent-color:var(--blue);">' +
      '<img src="' + av + '" style="width:32px;height:32px;border-radius:50%;margin-right:10px;object-fit:cover;">' +
      '<span style="font-size:14px;color:var(--text);">' + d.name + '</span>' +
      '</label>';
  }).join('');
}

function toggleMemoDream(dreamId, checked) {
  if (checked) {
    if (window._memoSelectedDreams.indexOf(dreamId) === -1) {
      window._memoSelectedDreams.push(dreamId);
    }
  } else {
    var idx = window._memoSelectedDreams.indexOf(dreamId);
    if (idx > -1) window._memoSelectedDreams.splice(idx, 1);
  }
}

function saveMemo() {
  initMemoData();
  var content = (document.getElementById('memoContentInput').value || '').trim();
  if (!content) { showToast('请写点什么'); return; }

  var remindOn = document.getElementById('memoRemindToggle').classList.contains('on');
  var dateVal = document.getElementById('memoDateInput').value;
  var timeVal = document.getElementById('memoTimeInput').value;

  if (remindOn) {
    if (!dateVal || !timeVal) { showToast('请设置提醒日期和时间'); return; }
    if (window._memoSelectedDreams.length === 0) { showToast('请至少选一个提醒角色'); return; }

    var remindAt = new Date(dateVal + 'T' + timeVal + ':00').getTime();
    if (isNaN(remindAt)) { showToast('日期时间无效'); return; }
    if (remindAt <= Date.now()) { showToast('提醒时间不能早于现在'); return; }
  }

  if (window._memoEditId) {
    // 编辑
    var memo = state.memos.find(function(x) { return x.id === window._memoEditId; });
    if (memo) {
      memo.content = content;
      memo.remindEnabled = remindOn;
      memo.remindDate = remindOn ? dateVal : '';
      memo.remindTime = remindOn ? timeVal : '';
      memo.dreamIds = remindOn ? window._memoSelectedDreams.slice() : [];
      if (!remindOn) memo.status = 'none';
      else if (memo.status === 'none') memo.status = 'pending';
      memo.remindedAt = 0;
      memo.lastRemindAt = 0;
      memo.remindedDreams = {};  // 重置每个梦角的提醒状态
    }
    showToast('已保存');
  } else {
    // 新建
    var newMemo = {
      id: 'memo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      content: content,
      remindEnabled: remindOn,
      remindDate: remindOn ? dateVal : '',
      remindTime: remindOn ? timeVal : '',
      dreamIds: remindOn ? window._memoSelectedDreams.slice() : [],
      status: remindOn ? 'pending' : 'none',
      remindedAt: 0,
      lastRemindAt: 0,
      remindedDreams: {},
      createdAt: Date.now()
    };
    state.memos.push(newMemo);
    showToast('已添加');
  }

  saveState();
  navigateTo('pageMemoList');
}

// ===== 定时检查提醒 =====
// ===== 定时检查提醒 =====
function checkMemoReminders() {
  initMemoData();
  if (state.memos.length === 0) return;
  var now = Date.now();

  state.memos.forEach(function(m) {
    if (!m.remindEnabled) return;
    if (m.status === 'done') return;
    if (!m.remindDate || !m.remindTime) return;

    var remindAt = new Date(m.remindDate + 'T' + m.remindTime + ':00').getTime();
    if (isNaN(remindAt)) return;
    if (now < remindAt) return;

    // 每个梦角独立判断是否已提醒过
    if (!m.remindedDreams || typeof m.remindedDreams !== 'object') m.remindedDreams = {};

    var allDone = true;
    m.dreamIds.forEach(function(dreamId) {
      if (!m.remindedDreams[dreamId]) {
        // 这个梦角还没提醒 → 触发
        triggerMemoReminderForDream(m, dreamId);
        m.remindedDreams[dreamId] = now;
        allDone = false;
      }
    });

    // 兼容旧数据：如果没有 remindedDreams 字段，用旧的方式（只挑一个）
    if (m.dreamIds.length === 0) {
      if (m.remindedAt && now - m.remindedAt < 60000) return;
      triggerMemoReminder(m);
      m.remindedAt = now;
    }
  });

  // 如果当前正在聊天页 → 强制刷新一下，保证新卡片能立即出现
  if (state.currentChatId) {
    var chatPage = document.getElementById('pagePrivateChat');
    if (chatPage && chatPage.classList.contains('active')) {
      try {
        loadChatMessages();
        renderChatMessages();
      } catch(e) {}
    }
  }
  saveState();
}

function triggerMemoReminderForDream(m, dreamId) {
  var dream = state.dreams.find(function(x) { return x.id === dreamId; });
  if (!dream) return;

  if (!state.chatSessions[dreamId]) state.chatSessions[dreamId] = [];
  var packetId = 'mp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  var packet = {
    from: 'dream',
    type: 'memo',
    packetId: packetId,
    memoId: m.id,
    dreamId: dreamId,
    dreamName: dream.name,
    content: m.content,
    remindAt: m.remindDate + ' ' + m.remindTime,
    time: Date.now()
  };
  state.chatSessions[dreamId].push(packet);

  if (state.currentChatId === dreamId) {
    loadChatMessages();
    renderChatMessages();
  }

  // 刷新聊天列表，让红点出现
  try { renderChatList(); } catch(e) {}

  sendNotification(dream.name, '备忘录提醒');
  showToast('📝 「' + dream.name + '」提醒你：' + (m.content.length > 18 ? m.content.slice(0, 18) + '…' : m.content));
}

function triggerMemoReminder(m) {
  // 兼容老数据（没有 remindedDreams 字段时用）
  if (!m.dreamIds || m.dreamIds.length === 0) return;
  var dreamId = m.dreamIds[0];
  triggerMemoReminderForDream(m, dreamId);
  showToast('「' + (state.dreams.find(function(x) { return x.id === dreamId; }) || {}).name + '」提醒你：' + (m.content.length > 20 ? m.content.slice(0, 20) + '…' : m.content));
}

// ===== 稍后提醒 / 已完成 =====
function memoLater(packetId) {
  var found = findMemoPacket(packetId);
  if (!found) return;
  var memo = state.memos.find(function(x) { return x.id === found.packet.memoId; });
  if (!memo) return;

  // 5 分钟后重新提醒
  var newTime = new Date(Date.now() + 5 * 60 * 1000);
  memo.remindDate = newTime.getFullYear() + '-' +
    String(newTime.getMonth() + 1).padStart(2, '0') + '-' +
    String(newTime.getDate()).padStart(2, '0');
  memo.remindTime = String(newTime.getHours()).padStart(2, '0') + ':' +
    String(newTime.getMinutes()).padStart(2, '0');
  memo.remindedAt = 0;
  memo.remindedDreams = {};  // 重置，允许5分钟后再次全员提醒
  saveState();
  showToast('5 分钟后再次提醒你');
}

function memoDone(packetId) {
  var found = findMemoPacket(packetId);
  if (!found) return;
  var memo = state.memos.find(function(x) { return x.id === found.packet.memoId; });
  if (!memo) return;
  memo.status = 'done';
  saveState();
  showToast('已完成');
}

function findMemoPacket(packetId) {
  for (var cid in state.chatSessions) {
    var msgs = state.chatSessions[cid];
    if (!Array.isArray(msgs)) continue;
    for (var i = 0; i < msgs.length; i++) {
      if (msgs[i] && msgs[i].type === 'memo' && msgs[i].packetId === packetId) {
        return { msg: msgs[i], chatId: cid, packet: msgs[i] };
      }
    }
  }
  return null;
}

// ===== 备忘录详情弹窗 =====
window._memoDetailPacketId = null;

function openMemoDetail(packetId) {
  var found = findMemoPacket(packetId);
  if (!found) return;
  window._memoDetailPacketId = packetId;

  var m = found.packet;
  var memo = state.memos.find(function(x) { return x.id === m.memoId; });

  var body = document.getElementById('memoDetailBody');
  var content = memo ? memo.content : (m.content || '');
  var remindAt = m.remindAt || (memo ? (memo.remindDate + ' ' + memo.remindTime) : '');
  var statusText = memo && memo.status === 'done' ? '已完成' : '未完成';

  var html = '';
  html += '<div style="font-size:11px;color:#86868b;margin-bottom:10px;">⏰ ' + escapeHtml(remindAt) + ' · ' + statusText + '</div>';
  html += '<div style="padding:14px 16px;background:#f8f8fa;border-radius:12px;font-size:14px;color:#1d1d1f;line-height:1.7;white-space:pre-wrap;word-break:break-word;max-height:50vh;overflow-y:auto;">' + escapeHtml(content) + '</div>';

  body.innerHTML = html;
  document.getElementById('memoDetailModal').classList.add('show');
}

function closeMemoDetailModal() {
  document.getElementById('memoDetailModal').classList.remove('show');
  window._memoDetailPacketId = null;
}

function memoDetailLater() {
  var packetId = window._memoDetailPacketId;
  if (!packetId) return;
  memoLater(packetId);
  closeMemoDetailModal();
}

function memoDetailDone() {
  var packetId = window._memoDetailPacketId;
  if (!packetId) return;
  memoDone(packetId);
  closeMemoDetailModal();
  // 如果当前在聊天页，刷新一下，让卡片状态更新
  if (state.currentChatId) {
    loadChatMessages();
    renderChatMessages();
  }
}

// ===== 抉择功能 =====
function openChoicePanel() {
  document.getElementById('actionMenuPanel').style.display = 'none';

  // 只支持私聊
  if (!state.currentChatId || state.currentChatId.startsWith('group_')) {
    showToast('抉择只能在私聊里使用');
    return;
  }

  document.getElementById('choiceQuestionInput').value = '';
  document.getElementById('choiceOptionsContainer').innerHTML = '';
  addChoiceOption();
  addChoiceOption();

  document.getElementById('choiceModal').classList.add('show');
  setTimeout(function() {
    document.getElementById('choiceQuestionInput').focus();
  }, 100);
}

function closeChoiceModal() {
  document.getElementById('choiceModal').classList.remove('show');
}

function addChoiceOption() {
  var container = document.getElementById('choiceOptionsContainer');
  var count = container.querySelectorAll('.quiz-opt-row').length;
  if (count >= 10) { showToast('最多 10 个选项'); return; }
  var row = document.createElement('div');
  row.className = 'quiz-opt-row';
  row.innerHTML = '<input type="text" placeholder="选项 ' + (count + 1) + '"><span class="quiz-opt-del">×</span>';
  container.appendChild(row);
  row.querySelector('.quiz-opt-del').onclick = function() {
    if (container.querySelectorAll('.quiz-opt-row').length <= 2) {
      showToast('至少保留 2 个选项');
      return;
    }
    row.remove();
  };
  var inp = row.querySelector('input');
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addChoiceOption();
    }
  });
}

function sendChoice() {
  var question = (document.getElementById('choiceQuestionInput').value || '').trim();
  if (!question) { showToast('请输入问题'); return; }

  var rows = document.querySelectorAll('#choiceOptionsContainer .quiz-opt-row');
  var options = [];
  rows.forEach(function(r) {
    var v = (r.querySelector('input').value || '').trim();
    if (v) options.push(v);
  });
  if (options.length < 2) { showToast('至少 2 个选项'); return; }

  if (!state.currentChatId) { showToast('请先进入聊天'); return; }

  var packetId = 'ch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  var packet = {
    from: 'user',
    type: 'choice',
    packetId: packetId,
    askerId: 'user',
    askerName: state.profile.name || '我',
    targetId: state.currentChatId,
    question: question,
    options: options.slice(),
    answer: null,
    time: Date.now()
  };

  if (!state.chatSessions[state.currentChatId]) state.chatSessions[state.currentChatId] = [];
  state.chatSessions[state.currentChatId].push(packet);
  saveState();
  loadChatMessages();
  renderChatMessages();
  closeChoiceModal();

  // 梦角延迟 3-15 秒回答
  var dreamId = state.currentChatId;
  var delay = 3000 + Math.random() * 12000;
  setTimeout(function() {
    choiceDreamAnswer(packetId, dreamId);
  }, delay);
}

function choiceDreamAnswer(packetId, dreamId) {
  var msgs = state.chatSessions[dreamId] || [];
  var packet = null;
  for (var i = 0; i < msgs.length; i++) {
    if (msgs[i] && msgs[i].type === 'choice' && msgs[i].packetId === packetId) {
      packet = msgs[i]; break;
    }
  }
  if (!packet) return;
  if (packet.answer) return; // 已回答

  var dream = state.dreams.find(function(x) { return x.id === dreamId; });
  if (!dream) return;

  // 随机选一个选项
  var pick = packet.options[Math.floor(Math.random() * packet.options.length)];
  packet.answer = pick;
  packet.answererId = dreamId;
  packet.answererName = dream.name;
  packet.answeredAt = Date.now();

  // 在聊天里加一条梦角的回复消息
  if (!state.chatSessions[dreamId]) state.chatSessions[dreamId] = [];
  state.chatSessions[dreamId].push({
    from: 'dream',
    senderId: dreamId,
    senderAvatar: dream.avatar || '',
    text: pick,
    time: Date.now()
  });
  saveState();

  if (state.currentChatId === dreamId) {
    loadChatMessages();
    renderChatMessages();
  }

  try { renderChatList(); } catch(e) {}
  sendNotification(dream.name, '选择了「' + pick + '」');
}

// ===== 头像库 =====
window._avatarEditMode = false;
window._avatarSelected = [];

function initAvatarData() {
  if (!state.avatarLibrary || !Array.isArray(state.avatarLibrary)) state.avatarLibrary = [];
  if (state.lastAvatarScan === undefined) state.lastAvatarScan = 0;
}

function renderAvatarLib() {
  initAvatarData();
  var grid = document.getElementById('avatarLibGrid');
  var editBtn = document.getElementById('avatarEditBtn');
  if (!grid) return;

  if (editBtn) {
    editBtn.textContent = window._avatarEditMode ? '完成' : '编辑';
    editBtn.style.color = window._avatarEditMode ? 'var(--red)' : 'var(--blue)';
  }

  if (state.avatarLibrary.length === 0) {
    grid.innerHTML = '<div class="avatar-lib-empty">还没有头像<br>点右上角 + 导入一批图片吧<br><span style="font-size:11px;opacity:0.7;margin-top:6px;display:block;">导入后梦角有概率随机更换成这里的头像</span></div>';
    return;
  }

  var html = '';
  state.avatarLibrary.forEach(function(img, i) {
    var selected = window._avatarSelected.indexOf(i) > -1;
    html += '<div class="avatar-lib-item' + (selected ? ' selected' : '') + '" onclick="avatarItemClick(' + i + ')">';
    html += '<img src="' + img + '">';
    if (window._avatarEditMode) {
      html += '<div class="avatar-lib-check' + (selected ? ' checked' : '') + '">' + (selected ? '✓' : '') + '</div>';
    }
    html += '</div>';
  });
  grid.innerHTML = html;
}

function avatarItemClick(i) {
  if (window._avatarEditMode) {
    var pos = window._avatarSelected.indexOf(i);
    if (pos > -1) window._avatarSelected.splice(pos, 1);
    else window._avatarSelected.push(i);
    renderAvatarLib();
  }
}

function toggleAvatarEdit() {
  window._avatarEditMode = !window._avatarEditMode;
  if (!window._avatarEditMode) window._avatarSelected = [];
  renderAvatarLib();
  if (window._avatarEditMode) {
    // 编辑模式下，右上角 + 号在编辑时禁用（避免误触）
    showToast('点击图片可多选');
  }
}

function openAvatarImport() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = function(e) {
    var files = e.target.files;
    if (!files || files.length === 0) return;
    var total = files.length;
    showToast('正在处理 ' + total + ' 张图片…');

    var promises = [];
    for (var i = 0; i < total; i++) {
      promises.push(compressAvatarImg(files[i]));
    }
    Promise.all(promises).then(function(results) {
      initAvatarData();
      results.forEach(function(r) {
        if (r) state.avatarLibrary.push(r);
      });
      saveState();
      renderAvatarLib();
      showToast('成功导入 ' + results.length + ' 张');
    }).catch(function(err) {
      showToast('导入失败：' + err.message);
    });
  };
  input.click();
}

function compressAvatarImg(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var MAX_SIZE = 400;
        var w = img.width, h = img.height;
        if (w > h) {
          if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; }
        } else {
          if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; }
        }
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = function() { reject(new Error('图片加载失败')); };
      img.src = ev.target.result;
    };
    reader.onerror = function() { reject(new Error('读取失败')); };
    reader.readAsDataURL(file);
  });
}

// 编辑模式下，如果需要删除选中的头像
// 由于顶部 + 号在编辑模式下不方便换图标，我们让 + 号在编辑模式下变成"删除"
// 其实更好的方案：用长按或额外按钮。这里采用"编辑模式下，+ 号变为删除"的临时方案不可靠
// 采用：编辑模式时，页面里加一个删除按钮条
// —— 简化：编辑模式下按钮显示"删除"，点击后删

// 重写 toggleAvatarEdit 更完善：
var _origToggleAvatarEdit = toggleAvatarEdit;
toggleAvatarEdit = function() {
  if (window._avatarEditMode) {
    // 退出编辑模式
    window._avatarEditMode = false;
    window._avatarSelected = [];
    renderAvatarLib();
    return;
  }
  // 进入编辑模式
  window._avatarEditMode = true;
  window._avatarSelected = [];
  renderAvatarLib();
  // 显示操作条
  showAvatarEditBar();
};

function showAvatarEditBar() {
  var old = document.getElementById('avatarEditBar');
  if (old) old.remove();
  var bar = document.createElement('div');
  bar.id = 'avatarEditBar';
  bar.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:rgba(255,255,255,0.96);border-top:1px solid #e5e5ea;padding:14px 16px 24px;box-sizing:border-box;display:flex;gap:12px;z-index:30;';
  bar.innerHTML =
    '<button onclick="avatarSelectAll()" style="flex:1;padding:16px 10px;border-radius:14px;font-size:16px;font-weight:600;border:1px solid #e5e5ea;background:#fff;color:#1d1d1f;cursor:pointer;font-family:inherit;">全选</button>' +
    '<button onclick="avatarDeleteSelected()" style="flex:1;padding:16px 10px;border-radius:14px;font-size:16px;font-weight:600;border:none;background:rgba(255,59,48,0.9);color:#fff;cursor:pointer;font-family:inherit;">删除</button>' +
    '<button onclick="avatarCancelEdit()" style="flex:1;padding:16px 10px;border-radius:14px;font-size:16px;font-weight:600;border:1px solid #e5e5ea;background:#fff;color:#1d1d1f;cursor:pointer;font-family:inherit;">取消</button>';
  var page = document.getElementById('pageAvatar');
  if (page) page.appendChild(bar);
}

function removeAvatarEditBar() {
  var bar = document.getElementById('avatarEditBar');
  if (bar) bar.remove();
}

function avatarSelectAll() {
  if (window._avatarSelected.length === state.avatarLibrary.length) {
    window._avatarSelected = [];
  } else {
    window._avatarSelected = state.avatarLibrary.map(function(_, i) { return i; });
  }
  renderAvatarLib();
}

function avatarDeleteSelected() {
  if (window._avatarSelected.length === 0) {
    showToast('请先选择要删除的头像');
    return;
  }
  if (!confirm('确定删除选中的 ' + window._avatarSelected.length + ' 张头像吗？')) return;

  var sorted = window._avatarSelected.slice().sort(function(a, b) { return b - a; });
  sorted.forEach(function(i) { state.avatarLibrary.splice(i, 1); });
  window._avatarSelected = [];
  saveState();
  renderAvatarLib();
  showToast('已删除');
}

function avatarCancelEdit() {
  window._avatarEditMode = false;
  window._avatarSelected = [];
  removeAvatarEditBar();
  renderAvatarLib();
}

// 每次渲染头像页时，同步编辑条
var _origRenderAvatarLib = renderAvatarLib;
renderAvatarLib = function() {
  _origRenderAvatarLib();
  if (window._avatarEditMode) {
    showAvatarEditBar();
  } else {
    removeAvatarEditBar();
  }
};

// ===== 头像自动更换扫描 =====
function checkAvatarRandomChange() {
  initAvatarData();
  if (state.avatarLibrary.length === 0) return;
  if (!state.dreams || state.dreams.length === 0) return;

  var now = Date.now();
  var last = state.lastAvatarScan || 0;
  var THREE_HOURS = 3 * 60 * 60 * 1000;
  if (now - last < THREE_HOURS) return;

  state.lastAvatarScan = now;
  saveState();

  // 30% 概率触发一次更换
  if (Math.random() > 0.30) return;

  // 随机选一个操作者梦角和一个头像
  var dreamA = state.dreams[Math.floor(Math.random() * state.dreams.length)];
  var img = state.avatarLibrary[Math.floor(Math.random() * state.avatarLibrary.length)];

  var roll = Math.random();
  
  // 如果有多个梦角，就有概率互相换
  if (state.dreams.length >= 2) {
    if (roll < 0.33) {
      // 1. 梦角给自己换
      dreamA.avatar = img;
      if (state.dream && state.dream.id === dreamA.id) state.dream = Object.assign({}, dreamA);
      addAvatarSystemMsg(dreamA.id, '「' + dreamA.name + '」为自己更换了头像');
      showToast('「' + dreamA.name + '」换了新头像');
    } else if (roll < 0.66) {
      // 2. 梦角给用户换
      state.profile.avatar = img;
      addAvatarSystemMsg(dreamA.id, '「' + dreamA.name + '」为' + (state.profile.name || '我') + '更换了头像');
      showToast('「' + dreamA.name + '」为你换了新头像');
      try { renderDiaryCover(); } catch(e) {}
      try { loadProfileForm(); } catch(e) {}
       } else {
      // 3. 梦角给另一个梦角换
      var otherDreams = state.dreams.filter(function(d) { return d.id !== dreamA.id; });
      var dreamB = otherDreams[Math.floor(Math.random() * otherDreams.length)];
      
      dreamB.avatar = img;
      if (state.dream && state.dream.id === dreamB.id) state.dream = Object.assign({}, dreamB);
      
      // 在操作者 A 的聊天里发系统提示
      addAvatarSystemMsg(dreamA.id, '「' + dreamA.name + '」为「' + dreamB.name + '」更换了头像');
      // 在被换者 B 的聊天里也发系统提示（同样写全名，不写“你”）
      addAvatarSystemMsg(dreamB.id, '「' + dreamA.name + '」为「' + dreamB.name + '」更换了头像');
      
      showToast('「' + dreamA.name + '」给「' + dreamB.name + '」换了新头像');
      
      // 如果当前在被换头像的梦角聊天界面，刷新一下
      if (state.currentChatId === dreamB.id) {
         var header = document.getElementById('chatHeaderName');
         if (header) header.textContent = dreamB.name + (dreamB.currentStatus ? ' · ' + dreamB.currentStatus : '');
      }
    }
  } else {
    // 只有一个梦角，只能给自己或用户换
    if (roll < 0.5) {
      dreamA.avatar = img;
      if (state.dream && state.dream.id === dreamA.id) state.dream = Object.assign({}, dreamA);
      addAvatarSystemMsg(dreamA.id, '「' + dreamA.name + '」为自己更换了头像');
      showToast('「' + dreamA.name + '」换了新头像');
    } else {
      state.profile.avatar = img;
      addAvatarSystemMsg(dreamA.id, '「' + dreamA.name + '」为' + (state.profile.name || '我') + '更换了头像');
      showToast('「' + dreamA.name + '」为你换了新头像');
      try { renderDiaryCover(); } catch(e) {}
      try { loadProfileForm(); } catch(e) {}
    }
  }

  saveState();
  try { renderChatList(); } catch(e) {}
  try { renderDreamRoles(); } catch(e) {}
}

function addAvatarSystemMsg(chatId, text) {
  if (!state.chatSessions[chatId]) state.chatSessions[chatId] = [];
  state.chatSessions[chatId].push({ from: 'system', text: text, time: Date.now() });
  saveState();
  if (state.currentChatId === chatId) {
    loadChatMessages();
    renderChatMessages();
  }
  try { renderChatList(); } catch(e) {}
}

// ===== 主屏幕图标红点 =====
function getChatUnreadCount() {
  var total = 0;
  if (state.dreams) {
    state.dreams.forEach(function(d) {
      if (state.mutedChats && state.mutedChats.indexOf(d.id) > -1) return;
      var lr = (state.lastReadAt && state.lastReadAt[d.id]) || 0;
      (state.chatSessions[d.id] || []).forEach(function(x) {
        if (x.from === 'dream' && x.time > lr) total++;
      });
    });
  }
  if (state.groups) {
    state.groups.forEach(function(g) {
      if (state.mutedChats && state.mutedChats.indexOf(g.id) > -1) return;
      var lr2 = (state.lastReadAt && state.lastReadAt[g.id]) || 0;
      (state.chatSessions[g.id] || []).forEach(function(x) {
        if (x.from === 'dream' && x.time > lr2) total++;
      });
    });
  }
  return total;
}

function getMailUnreadCount() {
  if (!state.mails) return 0;
  return state.mails.filter(function(m) { return m.from !== 'user' && !m.read; }).length;
}

function updateAppIconBadges() {
  function applyBadge(key, count) {
    var icon = document.querySelector('.app-icon[data-app-key="' + key + '"]');
    if (!icon) return;
    var imgDiv = icon.querySelector('.app-icon-img');
    if (!imgDiv) return;
    imgDiv.style.position = 'relative';
    var old = imgDiv.querySelector('.app-icon-badge');
    if (old) old.remove();
    if (count > 0) {
      var b = document.createElement('span');
      b.className = 'app-icon-badge';
      b.textContent = count > 99 ? '99+' : count;
      imgDiv.appendChild(b);
    }
  }
  
  var chatCount = getChatUnreadCount();
  var mailCount = getMailUnreadCount();
  
  // 1. 更新主屏幕桌面的图标红点
  applyBadge('pageWeChat', chatCount);
  applyBadge('pageMailbox', mailCount);
  
  // 2. ===== 新增：更新底部导航栏聊天的红点 =====
  var navChatDot = document.getElementById('chatNavRedDot');
  if (navChatDot) {
    if (chatCount > 0) {
      navChatDot.style.display = 'block';
      navChatDot.textContent = chatCount > 99 ? '99+' : chatCount;
    } else {
      navChatDot.style.display = 'none';
    }
  }
}

// 保存全局聊天美化
function saveChatBeautify() {
  var style = document.getElementById('globalBubbleStyle').value;
  chatSettings.bubbleStyle = style;
  localStorage.setItem('dreamChatSettings', JSON.stringify(chatSettings));
  showToast('气泡风格已保存');
  navigateTo('pageWeChat'); switchWeChatTab('me');
}

// 初始化美化页和聊天设置页的数据
function initChatBeautifyPages() {
  var globalSelect = document.getElementById('globalBubbleStyle');
  if (globalSelect) globalSelect.value = chatSettings.bubbleStyle || 'default';

  var cs = getCurrentChatSettings();
  var el1 = document.getElementById('bubbleUserColor');
  var el2 = document.getElementById('bubbleDreamColor');
  var el3 = document.getElementById('chatFontColor');
  if (el1) el1.value = cs.bubbleUser;
  if (el2) el2.value = cs.bubbleDream;
  if (el3) el3.value = cs.fontColor;

  var specificCSS = document.getElementById('chatSpecificCSS');
  if (specificCSS) {
    specificCSS.value = state.chatCustomStyles[state.currentChatId] || '';
  }

  var chatBgStatus = document.getElementById('chatBgStatus');
  var chatBgPreview = document.getElementById('chatBgPreview');
  if (cs.bg) {
    if(chatBgStatus) chatBgStatus.textContent = '已设置 ✓';
    if(chatBgPreview) {
      chatBgPreview.style.display = 'block';
      chatBgPreview.style.background = 'url(' + cs.bg + ') center/cover';
    }
  } else {
    if(chatBgStatus) chatBgStatus.textContent = '点击选择图片';
    if(chatBgPreview) chatBgPreview.style.display = 'none';
  }
}

// ==========================================
// ===== 情侣时间小组件 专用逻辑 =====
// ==========================================

function getAnniversaryWidgetConfig() {
  if (!state.settings.anniversaryWidget) {
    state.settings.anniversaryWidget = {
      bgImg: '',
      bgOpacity: 1,
      bgBlur: 8, // 新增：模糊度
      stampImg: '',
      customText: '"水母的心脏是72%的眼泪"', // 新增：自定义文字
      timeColor: '#ffffff',
      stampBorder: '#e5e5ea'
    };
  }
  // 兼容旧数据
  if (state.settings.anniversaryWidget.bgBlur === undefined) state.settings.anniversaryWidget.bgBlur = 8;
  if (state.settings.anniversaryWidget.customText === undefined) state.settings.anniversaryWidget.customText = '"水母的心脏是72%的眼泪"';
  
  return state.settings.anniversaryWidget;
}

function renderAnniversaryWidgetHTML() {
  var cfg = getAnniversaryWidgetConfig();
  
  var now = new Date();
  var h = String(now.getHours()).padStart(2, '0');
  var m = String(now.getMinutes()).padStart(2, '0');
  var month = String(now.getMonth() + 1).padStart(2, '0');
  var date = String(now.getDate()).padStart(2, '0');
  
  // 直接改成纯中文
  var weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  var week = weekDays[now.getDay()];

  var currentHour = now.getHours();
  var currentMinute = now.getMinutes();
  var remainHoursDec = 24 - currentHour - (currentMinute / 60);
  var remainHours = Math.floor(remainHoursDec);
  var progressPercent = (remainHoursDec / 24) * 100;
  
  var remainText = remainHours < 10 ? '0' + remainHours : remainHours;

  var blurPx = (cfg.bgBlur !== undefined && cfg.bgBlur !== null) ? cfg.bgBlur : 8;
  var opacityVal = (cfg.bgOpacity !== undefined && cfg.bgOpacity !== null) ? cfg.bgOpacity : 1;
  
  var bgLayer = '';
  if (cfg.bgImg) {
    bgLayer = `<img src="${cfg.bgImg}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:${opacityVal};filter:blur(${blurPx}px);z-index:0;pointer-events:none;">`;
  }

  var stampInner = cfg.stampImg 
    ? `<img src="${cfg.stampImg}" style="width:100%;height:100%;object-fit:cover;">` 
    : `<div style="width:100%;height:100%;background:rgba(255,255,255,0.1);display:flex;justify-content:center;align-items:center;color:#aaa;font-size:12px;">图片</div>`;

  var starSvg = `<svg viewBox="0 0 24 24" fill="#fff" style="width:10px;height:10px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

  return `
    <div onclick="navigateTo('pageAnniversaryWidgetEdit')" style="position:absolute;inset:0;cursor:pointer;border-radius:20px;overflow:hidden;z-index:10;background:transparent;">
      
      ${bgLayer}
      
      <div style="position:absolute;inset:0;padding:0 16px;display:flex;align-items:center;justify-content:center;gap:14px;z-index:2;box-sizing:border-box;">
        
        <div style="width:76px;height:76px;flex-shrink:0;border-radius:12px;border:2px solid ${cfg.stampBorder};box-sizing:border-box;overflow:hidden;position:relative;background:#111;">
          ${stampInner}
          <div style="position:absolute;top:4px;right:4px;">${starSvg}</div>
          <div style="position:absolute;bottom:4px;right:6px;">${starSvg}</div>
        </div>

        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;">
          
          <div id="awTimeDisplay" style="font-size:32px;font-weight:900;font-family:'Arial Black', Impact, sans-serif;color:${cfg.timeColor || '#ffffff'};line-height:1;text-shadow:0 2px 4px rgba(0,0,0,0.8);letter-spacing:1px;">
            ${h}:${m}
          </div>
          
          <div id="awDateDisplay" style="font-size:12px;color:${cfg.timeColor || '#ffffff'};opacity:0.9;margin-top:4px;font-weight:600;letter-spacing:0.5px;text-shadow:0 1px 3px rgba(0,0,0,0.8);">
            ${month}-${date} &nbsp;${week}
          </div>
          
          <div style="font-size:10px;color:${cfg.timeColor || '#ffffff'};opacity:0.8;margin-top:4px;font-style:italic;text-shadow:0 1px 2px rgba(0,0,0,0.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${cfg.customText || ''}
          </div>
          
          <div style="margin-top:10px;width:100%;">
            <div style="width:100%;height:6px;background:rgba(255,255,255,0.2);border-radius:3px;overflow:hidden;">
              <div id="awProgressBar" style="height:100%;width:${progressPercent}%;background:${cfg.timeColor || '#ffffff'};border-radius:3px;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:${cfg.timeColor || '#ffffff'};opacity:0.8;text-shadow:0 1px 2px rgba(0,0,0,0.8);">
              <span>today</span>
              <span id="awRemainText">${remainText}h</span>
            </div>
          </div>
        </div>
      </div>

      <div style="position:absolute;top:10px;right:10px;transform:scale(1.2);opacity:0.8;z-index:2;">${starSvg}</div>
      <div style="position:absolute;bottom:15px;right:20px;transform:scale(0.7);opacity:0.6;z-index:2;">${starSvg}</div>
    </div>
  `;
}

function injectAnniversaryWidget(pageElement) {
  var wdDiv = document.createElement('div');
  wdDiv.style.cssText = 'grid-column: span 4; grid-row: span 2; width:100%; height:100%; position:relative; z-index:10;';
  wdDiv.innerHTML = renderAnniversaryWidgetHTML();
  pageElement.appendChild(wdDiv);
}

function openAnniversaryWidgetEdit() {
  var cfg = getAnniversaryWidgetConfig();
  
  // 回显数据
  document.getElementById('awBgOpacity').value = cfg.bgOpacity;
  document.getElementById('awBgBlur').value = cfg.bgBlur || 8;
  document.getElementById('awBlurLabel').textContent = cfg.bgBlur || 8;
  document.getElementById('awTimeColor').value = cfg.timeColor;
  document.getElementById('awStampBorder').value = cfg.stampBorder;
  document.getElementById('awCustomText').value = cfg.customText || '';
  
  // 清空文件选择框
  document.getElementById('awBgImg').value = '';
  document.getElementById('awStampImg').value = '';
}

function saveAnniversaryWidget() {
  var cfg = getAnniversaryWidgetConfig();
  
  cfg.bgOpacity = parseFloat(document.getElementById('awBgOpacity').value);
  cfg.bgBlur = parseInt(document.getElementById('awBgBlur').value);
  cfg.timeColor = document.getElementById('awTimeColor').value;
  cfg.stampBorder = document.getElementById('awStampBorder').value;
  cfg.customText = document.getElementById('awCustomText').value.trim();

  var bgFile = document.getElementById('awBgImg').files[0];
  var stampFile = document.getElementById('awStampImg').files[0];

  var processImage = function(file, callback) {
    if (!file) return callback();
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var MAX = 600;
        var w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  processImage(bgFile, function(bgData) {
    if (bgData) cfg.bgImg = bgData;
    processImage(stampFile, function(stampData) {
      if (stampData) cfg.stampImg = stampData;
      
      saveState();
      showToast('小组件已保存');
      navigateTo('pageHome');
      renderAppIcons(); 
    });
  });
}

function resetAnniversaryWidget() {
  if (!confirm('确定要恢复默认设置吗？')) return;
  state.settings.anniversaryWidget = null;
  saveState();
  navigateTo('pageHome');
  renderAppIcons();
  showToast('已恢复默认');
}

// ===== 小组件时间自动同步器 =====
function updateAnniversaryWidgetTime() {
  var timeEl = document.getElementById('awTimeDisplay');
  var dateEl = document.getElementById('awDateDisplay');
  var progressEl = document.getElementById('awProgressBar');
  var remainEl = document.getElementById('awRemainText');

  if (!timeEl || !dateEl) return;

  var now = new Date();
  var h = String(now.getHours()).padStart(2, '0');
  var m = String(now.getMinutes()).padStart(2, '0');
  var month = String(now.getMonth() + 1).padStart(2, '0');
  var date = String(now.getDate()).padStart(2, '0');
  
  // 中文星期
  var weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  var week = weekDays[now.getDay()];

  var currentHour = now.getHours();
  var currentMinute = now.getMinutes();
  var remainHoursDec = 24 - currentHour - (currentMinute / 60);
  var remainHours = Math.floor(remainHoursDec);
  var progressPercent = (remainHoursDec / 24) * 100;
  var remainText = remainHours < 10 ? '0' + remainHours : remainHours;

  timeEl.textContent = h + ':' + m;
  dateEl.innerHTML = month + '-' + date + ' &nbsp;' + week;
  if (progressEl) progressEl.style.width = progressPercent + '%';
  if (remainEl) remainEl.textContent = remainText + 'h';
}

setInterval(updateAnniversaryWidgetTime, 1000);

// ==========================================
// ===== 拍立得小组件 专用逻辑 =====
// ==========================================

function getPolaroidWidgetConfig() {
  if (!state.settings.polaroidWidget) {
    state.settings.polaroidWidget = {
      bgImg: '',
      photoImg: '',
      text: '私たちの約束...',
      borderColor: '#ffffff',
      textColor: '#333333',
      bgBlur: 8,
      bgOpacity: 1
    };
  }
  return state.settings.polaroidWidget;
}

function renderPolaroidWidgetHTML() {
  var cfg = getPolaroidWidgetConfig();
  
  var bgLayer = '';
  if (cfg.bgImg) {
    bgLayer = `<img src="${cfg.bgImg}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:${cfg.bgOpacity};filter:blur(${cfg.bgBlur}px);z-index:0;pointer-events:none;">`;
  } else {
    bgLayer = `<div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.3);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:0;"></div>`;
  }

  var photoHtml = cfg.photoImg 
    ? `<img src="${cfg.photoImg}" style="width:100%;height:100%;object-fit:cover;">`
    : `<div style="width:100%;height:100%;background:#e5e5ea;display:flex;justify-content:center;align-items:center;color:#999;font-size:12px;">照片</div>`;

  return `
    <div onclick="navigateTo('pagePolaroidWidgetEdit')" style="position:absolute;inset:0;border-radius:20px;overflow:hidden;cursor:pointer;background:transparent;box-shadow:0 4px 14px rgba(0,0,0,0.05);">
      ${bgLayer}
      
      <div style="position:absolute;inset:0;display:flex;justify-content:center;align-items:center;z-index:2;">
        
        <!-- 底层半透明拍立得 -->
        <div style="position:absolute;width:104px;height:130px;background:rgba(255,255,255,0.6);border-radius:2px;transform:rotate(-10deg) translate(-10px, -5px);box-shadow:0 4px 10px rgba(0,0,0,0.15);backdrop-filter:blur(2px);"></div>
        
        <!-- 顶层清晰拍立得 -->
        <div style="position:relative;width:116px;height:146px;background:${cfg.borderColor || '#ffffff'};border-radius:2px;transform:rotate(6deg);box-shadow:0 8px 20px rgba(0,0,0,0.25);padding:8px 8px 30px 8px;box-sizing:border-box;display:flex;flex-direction:column;">
          
          <!-- 照片区域 -->
          <div style="flex:1;background:#111;overflow:hidden;border:1px solid rgba(0,0,0,0.05);">
             ${photoHtml}
          </div>
          
          <!-- 文字区域 -->
          <div style="position:absolute;bottom:8px;left:0;width:100%;text-align:center;font-size:11px;color:${cfg.textColor || '#333'};font-family:'KaiTi', 'Comic Sans MS', cursive;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 6px;box-sizing:border-box;letter-spacing:0.5px;">
             ${cfg.text || ''}
          </div>
        </div>

      </div>
    </div>
  `;
}

function injectPolaroidWidget(pageElement) {
  var wdDiv = document.createElement('div');
  // 占两列两行，完美卡在左下角
  wdDiv.style.cssText = 'grid-column: span 2; grid-row: span 2; width:100%; height:100%; position:relative; z-index:10;'; 
  wdDiv.innerHTML = renderPolaroidWidgetHTML();
  pageElement.appendChild(wdDiv);
}

function openPolaroidWidgetEdit() {
  var cfg = getPolaroidWidgetConfig();
  document.getElementById('pwBgOpacity').value = cfg.bgOpacity;
  document.getElementById('pwBgBlur').value = cfg.bgBlur || 8;
  document.getElementById('pwBlurLabel').textContent = cfg.bgBlur || 8;
  document.getElementById('pwText').value = cfg.text || '';
  document.getElementById('pwBorderColor').value = cfg.borderColor || '#ffffff';
  document.getElementById('pwTextColor').value = cfg.textColor || '#333333';
  document.getElementById('pwBgImg').value = '';
  document.getElementById('pwPhotoImg').value = '';
}

function savePolaroidWidget() {
  var cfg = getPolaroidWidgetConfig();
  cfg.bgOpacity = parseFloat(document.getElementById('pwBgOpacity').value);
  cfg.bgBlur = parseInt(document.getElementById('pwBgBlur').value);
  cfg.text = document.getElementById('pwText').value.trim();
  cfg.borderColor = document.getElementById('pwBorderColor').value;
  cfg.textColor = document.getElementById('pwTextColor').value;

  var bgFile = document.getElementById('pwBgImg').files[0];
  var photoFile = document.getElementById('pwPhotoImg').files[0];

  var processImage = function(file, callback) {
    if (!file) return callback();
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var MAX = 600;
        var w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  processImage(bgFile, function(bgData) {
    if (bgData) cfg.bgImg = bgData;
    processImage(photoFile, function(photoData) {
      if (photoData) cfg.photoImg = photoData;
      
      saveState();
      showToast('拍立得小组件已保存');
      navigateTo('pageHome');
      renderAppIcons(); 
    });
  });
}

function resetPolaroidWidget() {
  if (!confirm('确定要恢复默认设置吗？')) return;
  state.settings.polaroidWidget = null;
  saveState();
  navigateTo('pageHome');
  renderAppIcons();
  showToast('已恢复默认');
}

// ==========================================
// ===== 桌面小纸条小组件 专用逻辑 (完整修复版) =====
// ==========================================

function getSayWidgetConfig() {
  if (!state.settings.sayWidget) {
    state.settings.sayWidget = {
      dreamId: '',
      bgImg: '',
      bgOpacity: 1,
      bgBlur: 0,
      bgColor: '#e1ebf5',
      textColor: '#666666',
      dashColor: '#b0c4d6',
      fontSize: 14, 
      currentCard: '',
      lastCardUpdate: 0
    };
  }
  return state.settings.sayWidget;
}

function renderSayWidgetHTML() {
  var cfg = getSayWidgetConfig();
  
  var avatarImg = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;background:#e0e8f0;"><text x="50" y="55" font-size="50" text-anchor="middle" dominant-baseline="middle">😈</text></svg>`;
  if (cfg.dreamId) {
    var d = state.dreams.find(function(x){ return x.id === cfg.dreamId; });
    if (d && d.avatar) {
      avatarImg = `<img src="${d.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
    }
  }

  var bgStyle = cfg.bgImg 
    ? `background:url(${cfg.bgImg}) center/cover;opacity:${cfg.bgOpacity};filter:blur(${cfg.bgBlur}px);`
    : `background:${cfg.bgColor};opacity:${cfg.bgOpacity};`;

  var cardHtml = '';
  if (cfg.currentCard) {
    cardHtml = `<div style="font-size:${cfg.fontSize}px;font-weight:normal;color:${cfg.textColor};text-align:center;line-height:1.2;padding:0 4px;word-break:break-all;">${cfg.currentCard}</div>`;
  }

  return `
    <div onclick="navigateTo('pageSayWidgetEdit')" style="position:absolute;inset:0;border-radius:20px;overflow:hidden;cursor:pointer;background:${cfg.bgColor};box-shadow:0 4px 12px rgba(0,0,0,0.08);display:flex;flex-direction:column;align-items:center;">
      
      <div style="position:absolute;inset:-10px;${bgStyle}"></div>
      
      <div style="position:relative;width:64px;height:64px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin-top:14px;overflow:hidden;z-index:2;background:#fff;">
        ${avatarImg}
      </div>

      <div style="position:relative;width:88%;flex:1;margin-top:10px;margin-bottom:14px;border:2px dashed ${cfg.dashColor};border-radius:6px;background:rgba(255,255,255,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2;box-sizing:border-box;padding:4px;">
        
        ${cardHtml}
        
        <div style="width:60%;height:4px;background:rgba(0,0,0,0.03);border-radius:2px;margin-top:6px;"></div>
      </div>
    </div>
  `;
}

function injectSayWidget(pageElement) {
  var wdDiv = document.createElement('div');
  wdDiv.style.cssText = 'grid-column: span 2; grid-row: span 2; width:100%; height:100%; position:relative; z-index:10;';
  wdDiv.innerHTML = renderSayWidgetHTML();
  pageElement.appendChild(wdDiv);
}

function initSayWidgetEdit() {
  var cfg = getSayWidgetConfig();
  var sel = document.getElementById('swDreamSelect');
  if(!sel) return;
  
  sel.innerHTML = '<option value="">不显示（默认小恶魔）</option>' + 
    state.dreams.map(function(d){ return `<option value="${d.id}">${d.name}</option>`; }).join('');
  sel.value = cfg.dreamId || '';

  document.getElementById('swBgOpacity').value = cfg.bgOpacity;
  document.getElementById('swBgBlur').value = cfg.bgBlur;
  document.getElementById('swBlurVal').textContent = cfg.bgBlur;
  document.getElementById('swBgColor').value = cfg.bgColor;
  document.getElementById('swTextColor').value = cfg.textColor;
  document.getElementById('swDashColor').value = cfg.dashColor;
  document.getElementById('swFontSize').value = cfg.fontSize;
  document.getElementById('swFontSizeVal').textContent = cfg.fontSize;
  document.getElementById('swBgImg').value = '';
}

function saveSayWidget() {
  var cfg = getSayWidgetConfig();
  cfg.dreamId = document.getElementById('swDreamSelect').value;
  cfg.bgOpacity = parseFloat(document.getElementById('swBgOpacity').value);
  cfg.bgBlur = parseInt(document.getElementById('swBgBlur').value);
  cfg.bgColor = document.getElementById('swBgColor').value;
  cfg.textColor = document.getElementById('swTextColor').value;
  cfg.dashColor = document.getElementById('swDashColor').value;
  cfg.fontSize = parseInt(document.getElementById('swFontSize').value);

  var bgFile = document.getElementById('swBgImg').files[0];
  var processImage = function(file, callback) {
    if (!file) return callback();
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var MAX = 600;
        var w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/png'));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  processImage(bgFile, function(bgData) {
    if (bgData) cfg.bgImg = bgData;
    saveState();
    showToast('桌面小纸条小组件已保存');
    navigateTo('pageHome');
    renderAppIcons(); 
  });
}

function resetSayWidget() {
  if (!confirm('确定恢复默认吗？')) return;
  state.settings.sayWidget = null;
  saveState();
  navigateTo('pageHome');
  renderAppIcons();
  showToast('已恢复默认');
}

// ==========================================
// ===== 音乐播放器小组件 专用逻辑 =====
// ==========================================

function getMusicWidgetConfig() {
  if (!state.settings.musicWidget) {
    state.settings.musicWidget = {
      title: 'Love is the best magic~',
      cdImg: '',
      pic1: '',
      pic2: '',
      pic3: '',
      bgImg: '',
      bgColor: '#f8f9fa',
      textColor: '#555555',
      bgOpacity: 1,
      bgBlur: 0
    };
  }
  return state.settings.musicWidget;
}

function renderMusicWidgetHTML() {
  var cfg = getMusicWidgetConfig();
  
  var bgLayer = '';
  if (cfg.bgImg) {
    bgLayer = `<img src="${cfg.bgImg}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:${cfg.bgOpacity};filter:blur(${cfg.bgBlur}px);z-index:0;pointer-events:none;border-radius:16px;">`;
  } else {
    bgLayer = `<div style="position:absolute;inset:0;background:${cfg.bgColor};opacity:${cfg.bgOpacity};filter:blur(${cfg.bgBlur}px);z-index:0;pointer-events:none;border-radius:16px;"></div>`;
  }

  var cd = cfg.cdImg ? `<img src="${cfg.cdImg}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:30px;">💿</div>`;
  
  var p1 = cfg.pic1 ? `<img src="${cfg.pic1}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="width:100%;height:100%;background:#e0e0e0;"></div>`;
  var p2 = cfg.pic2 ? `<img src="${cfg.pic2}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="width:100%;height:100%;background:#e0e0e0;"></div>`;
  var p3 = cfg.pic3 ? `<img src="${cfg.pic3}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="width:100%;height:100%;background:#e0e0e0;"></div>`;

  var tc = cfg.textColor || '#555';

  // 铆钉组件
  var screw = `<div style="position:absolute;width:10px;height:10px;background:radial-gradient(circle at 30% 30%, #fff, #999);border-radius:50%;box-shadow:1px 1px 3px rgba(0,0,0,0.3);"></div>`;

  // 替换用的 SVG 图标
  var svgMusic = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${tc}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
  var svgSearch = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${tc}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  var svgPaw = `<svg viewBox="0 0 24 24" width="12" height="12" fill="${tc}"><path d="M12 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zm-5.5 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm11 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm-8.3 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm5.6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 15c-3.3 0-6 1.8-6 4v1h12v-1c0-2.2-2.7-4-6-4z"/></svg>`;
  var svgNote = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="${tc}" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
  var svgCat = `<svg viewBox="0 0 24 24" width="12" height="12" fill="${tc}"><path d="M12 2C9 2 6.5 3 5 5 3.5 7 3 10 3 12c0 4.4 3.6 8 8 8h2c4.4 0 8-3.6 8-8 0-2-.5-5-2-7-1.5-2-4-3-7-3zM9 10a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>`;

  return `
    <div onclick="navigateTo('pageMusicWidgetEdit')" style="position:absolute;inset:0;border-radius:16px;overflow:hidden;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.08);border:2px solid #fff;box-sizing:border-box;background:#fff;">
      ${bgLayer}
      
      <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;padding:14px;box-sizing:border-box;">
        
        <!-- 顶部搜索栏 -->
        <div style="display:flex;align-items:center;background:rgba(200,200,200,0.3);border-radius:12px;padding:6px 12px;margin-bottom:12px;flex-shrink:0;">
          <span style="margin-right:6px;display:flex;">${svgMusic}</span>
          <div style="flex:1;font-size:12px;font-style:italic;color:${tc};font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cfg.title}</div>
          <span style="display:flex;">${svgSearch}</span>
        </div>

        <!-- 主体区域：固定高度 90px，防止图片撑破 -->
        <div style="display:flex;gap:12px;height:90px;flex-shrink:0;">
          
          <!-- 左侧 CD -->
          <div style="width:90px;height:90px;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="width:80px;height:80px;border-radius:50%;border:2px dashed ${tc};position:relative;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
              ${cd}
              <!-- 原本中间的白色圆圈已删除 -->
            </div>
            <span style="position:absolute;top:-5px;left:-5px;font-size:12px;color:${tc};">♪</span>
            <span style="position:absolute;bottom:-2px;right:-5px;font-size:12px;color:${tc};">★</span>
          </div>

          <!-- 右侧三张图：高度 100% 限制 -->
          <div style="flex:1;display:flex;gap:6px;overflow:hidden;height:100%;">
            <div style="flex:1;border-radius:8px;border:2px solid #fff;overflow:hidden;background:#fff;height:100%;">${p1}</div>
            <div style="flex:1;border-radius:8px;border:2px solid #fff;overflow:hidden;background:#fff;transform:translateY(4px);height:95%;">${p2}</div>
            <div style="flex:1;border-radius:8px;border:2px solid #fff;overflow:hidden;background:#fff;height:100%;">${p3}</div>
          </div>

        </div>

        <!-- 底部控制栏：使用 margin-top:auto 自动吸底 -->
        <div style="margin-top:auto;padding-top:8px;flex-shrink:0;">
          <!-- 进度条 -->
          <div style="width:100%;height:4px;background:rgba(0,0,0,0.1);border-radius:2px;margin-bottom:6px;">
            <div style="width:30%;height:100%;background:${tc};border-radius:2px;"></div>
          </div>
          
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:${tc};">
            <div style="display:flex;gap:16px;font-weight:bold;align-items:center;">
              <span>00:00</span>
              <span style="cursor:pointer;">▶</span>
              <span style="cursor:pointer;">⏸</span>
              <span style="cursor:pointer;">⏭</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="display:flex;">${svgPaw}</span>
              <span style="display:flex;">${svgNote}</span>
              <span style="display:flex;">${svgCat}</span>
              <span style="margin-left:4px;">05:20</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 四角铆钉 -->
      <div style="top:6px;left:6px;">${screw}</div>
      <div style="top:6px;right:6px;">${screw}</div>
      <div style="bottom:6px;left:6px;">${screw}</div>
      <div style="bottom:6px;right:6px;">${screw}</div>
    </div>
  `;
}

function injectMusicWidget(pageElement) {
  var wdDiv = document.createElement('div');
  // 占满4列，2行
  wdDiv.style.cssText = 'grid-column: span 4; grid-row: span 2; width:100%; height:100%; position:relative; z-index:10;';
  wdDiv.innerHTML = renderMusicWidgetHTML();
  pageElement.appendChild(wdDiv);
}

function openMusicWidgetEdit() {
  var cfg = getMusicWidgetConfig();
  document.getElementById('mwTitle').value = cfg.title;
  document.getElementById('mwBgColor').value = cfg.bgColor;
  document.getElementById('mwTextColor').value = cfg.textColor;
  document.getElementById('mwBgOpacity').value = cfg.bgOpacity;
  document.getElementById('mwBgBlur').value = cfg.bgBlur || 0;
  document.getElementById('mwBlurVal').textContent = cfg.bgBlur || 0;
  
  document.getElementById('mwCdImg').value = '';
  document.getElementById('mwPic1').value = '';
  document.getElementById('mwPic2').value = '';
  document.getElementById('mwPic3').value = '';
  document.getElementById('mwBgImg').value = '';
}

function saveMusicWidget() {
  var btn = document.querySelector('#pageMusicWidgetEdit .page-header button:last-child');
  if (btn) { btn.disabled = true; btn.textContent = '保存中...'; }

  var cfg = getMusicWidgetConfig();
  cfg.title = document.getElementById('mwTitle').value.trim();
  cfg.bgColor = document.getElementById('mwBgColor').value;
  cfg.textColor = document.getElementById('mwTextColor').value;
  cfg.bgOpacity = parseFloat(document.getElementById('mwBgOpacity').value);
  cfg.bgBlur = parseInt(document.getElementById('mwBgBlur').value);

  var files = [
    document.getElementById('mwCdImg').files[0],
    document.getElementById('mwPic1').files[0],
    document.getElementById('mwPic2').files[0],
    document.getElementById('mwPic3').files[0],
    document.getElementById('mwBgImg').files[0]
  ];

  var processImage = function(file) {
    return new Promise(function(resolve) {
      if (!file) return resolve(null);
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var MAX = 500;
          var w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = function() { resolve(null); };
        img.src = e.target.result;
      };
      reader.onerror = function() { resolve(null); };
      reader.readAsDataURL(file);
    });
  };

  Promise.all(files.map(processImage)).then(function(results) {
    if (results[0]) cfg.cdImg = results[0];
    if (results[1]) cfg.pic1 = results[1];
    if (results[2]) cfg.pic2 = results[2];
    if (results[3]) cfg.pic3 = results[3];
    if (results[4]) cfg.bgImg = results[4];
    
    saveState();
    showToast('音乐组件已保存');
    if (btn) { btn.disabled = false; btn.textContent = '保存'; }
    
    navigateTo('pageHome');
    renderAppIcons(); 
  }).catch(function(err) {
    console.error(err);
    showToast('保存失败');
    if (btn) { btn.disabled = false; btn.textContent = '保存'; }
  });
}

function resetMusicWidget() {
  if (!confirm('确定要恢复默认吗？')) return;
  state.settings.musicWidget = null;
  saveState();
  navigateTo('pageHome');
  renderAppIcons();
  showToast('已恢复默认');
}

// ==========================================
// ===== 纪念日小组件 专用逻辑 =====
// ==========================================

function getFriendWidgetConfig() {
  if (!state.settings.friendWidget) {
    state.settings.friendWidget = {
      title: '成为最好的朋友',
      startDate: '2023-01-01', // 默认日期
      leftAvatar: '',
      rightAvatar: '',
      leftBubble: '^≡ω≡^',
      rightBubble: 'ʕ•ﻌ•ʔ',
      msgTop: '☆明天可以陪我出去玩吗☆',
      msgBottom: '☆当然啦，我会一直陪着你☆',
      bgImg: '',
      bgColor: 'rgb(248, 248, 248)',
      textColor: 'rgb(109, 109, 109)',
      bgOpacity: 1,
      bgBlur: 0
    };
  }
  return state.settings.friendWidget;
}

function renderFriendWidgetHTML() {
  var cfg = getFriendWidgetConfig();
  
  // 计算天数
  var days = 1;
  if (cfg.startDate) {
    var start = new Date(cfg.startDate).getTime();
    var now = new Date().setHours(0,0,0,0);
    var diff = now - start;
    if (diff >= 0) {
      days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  var bgLayer = '';
  if (cfg.bgImg) {
    bgLayer = `<img src="${cfg.bgImg}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:${cfg.bgOpacity};filter:blur(${cfg.bgBlur}px);z-index:0;pointer-events:none;">`;
  } else {
    bgLayer = `<div style="position:absolute;inset:0;background:${cfg.bgColor};opacity:${cfg.bgOpacity};filter:blur(${cfg.bgBlur}px);z-index:0;pointer-events:none;"></div>`;
  }

  var leftAv = cfg.leftAvatar ? `<img src="${cfg.leftAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : `<div style="width:100%;height:100%;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;">🐱</div>`;
  var rightAv = cfg.rightAvatar ? `<img src="${cfg.rightAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : `<div style="width:100%;height:100%;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;">🐶</div>`;

  var tColor = cfg.textColor || '#a15c6e';

  return `
    <div onclick="navigateTo('pageFriendWidgetEdit')" style="position:absolute;inset:0;border-radius:20px;overflow:hidden;cursor:pointer;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,0.05);">
      ${bgLayer}
      
      <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;padding:10px 12px;box-sizing:border-box;">
        
        <!-- 上半部分：头像、天数 -->
        <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:16px;position:relative;">
          
          <!-- 左侧头像 -->
          <div style="width:76px;height:76px;border-radius:50%;border:3px solid rgba(255,255,255,0.8);box-shadow:0 2px 10px rgba(200,100,120,0.15);background:#f8d7da;flex-shrink:0;position:relative;z-index:2;">
            ${leftAv}
          </div>
          
          <!-- 中间文字和心电图 -->
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100px;">
            <div style="font-size:12px;color:${tColor};font-weight:600;margin-bottom:2px;white-space:nowrap;">${cfg.title}</div>
            <div style="font-size:26px;font-weight:900;color:${tColor};font-family:'Arial Black', sans-serif;line-height:1;text-shadow:0 1px 2px rgba(255,255,255,0.8);">${days} <span style="font-size:12px;">天</span></div>
            <!-- 心电图 SVG -->
            <svg width="80" height="20" viewBox="0 0 100 20" fill="none" style="margin-top:4px;">
              <path d="M0 10 L30 10 L35 3 L40 17 L45 10 L100 10" stroke="${tColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
            </svg>
          </div>
          
          <!-- 右侧头像 -->
          <div style="width:76px;height:76px;border-radius:50%;border:3px solid rgba(255,255,255,0.8);box-shadow:0 2px 10px rgba(200,100,120,0.15);background:#f8d7da;flex-shrink:0;position:relative;z-index:2;">
            ${rightAv}
          </div>

        </div>

        <!-- 下半部分：对话留言 -->
        <div style="display:flex;flex-direction:column;gap:6px;padding-bottom:4px;">
          
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
            <div style="background:rgba(255,255,255,0.7);border:1px solid rgba(200,100,120,0.3);border-radius:20px;padding:4px 12px;font-size:10px;color:${tColor};font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">
              ${cfg.msgTop}
            </div>
            <span style="font-size:10px;color:${tColor};opacity:0.8;">已读</span>
          </div>

          <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="font-size:10px;color:${tColor};opacity:0.8;">未读</span>
            <div style="background:rgba(255,255,255,0.7);border:1px solid rgba(200,100,120,0.3);border-radius:20px;padding:4px 12px;font-size:10px;color:${tColor};font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">
              ${cfg.msgBottom}
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}

function injectFriendWidget(pageElement) {
  var wdDiv = document.createElement('div');
  // 占满4列，2行
  wdDiv.style.cssText = 'grid-column: span 4; grid-row: span 2; width:100%; height:100%; position:relative; z-index:10;';
  wdDiv.innerHTML = renderFriendWidgetHTML();
  pageElement.appendChild(wdDiv);
}

function openFriendWidgetEdit() {
  var cfg = getFriendWidgetConfig();
  document.getElementById('fwTitle').value = cfg.title;
  document.getElementById('fwStartDate').value = cfg.startDate;
  document.getElementById('fwLeftBubble').value = cfg.leftBubble;
  document.getElementById('fwRightBubble').value = cfg.rightBubble;
  document.getElementById('fwMsgTop').value = cfg.msgTop;
  document.getElementById('fwMsgBottom').value = cfg.msgBottom;
  document.getElementById('fwBgColor').value = cfg.bgColor;
  document.getElementById('fwTextColor').value = cfg.textColor;
  document.getElementById('fwBgOpacity').value = cfg.bgOpacity;
  document.getElementById('fwBgBlur').value = cfg.bgBlur || 0;
  document.getElementById('fwBlurVal').textContent = cfg.bgBlur || 0;
  
  document.getElementById('fwLeftAvatar').value = '';
  document.getElementById('fwRightAvatar').value = '';
  document.getElementById('fwBgImg').value = '';
}

function saveFriendWidget() {
  // 1. 防抖处理：防止用户连点导致卡死
  var btn = document.querySelector('#pageFriendWidgetEdit .page-header button:last-child');
  if (btn) {
    if (btn.disabled) return; 
    btn.disabled = true;
    btn.textContent = '保存中...';
  }

  var cfg = getFriendWidgetConfig();
  cfg.title = document.getElementById('fwTitle').value.trim();
  cfg.startDate = document.getElementById('fwStartDate').value;
  cfg.msgTop = document.getElementById('fwMsgTop').value.trim();
  cfg.msgBottom = document.getElementById('fwMsgBottom').value.trim();
  cfg.bgColor = document.getElementById('fwBgColor').value;
  cfg.textColor = document.getElementById('fwTextColor').value;
  cfg.bgOpacity = parseFloat(document.getElementById('fwBgOpacity').value);
  cfg.bgBlur = parseInt(document.getElementById('fwBgBlur').value);

  var leftAvFile = document.getElementById('fwLeftAvatar').files[0];
  var rightAvFile = document.getElementById('fwRightAvatar').files[0];
  var bgFile = document.getElementById('fwBgImg').files[0];

  // 2. 独立的图片处理函数，带异常捕获
  var processImage = function(file) {
    return new Promise(function(resolve) {
      if (!file) return resolve(null);
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var MAX = 400;
          var w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = function() { resolve(null); };
        img.src = e.target.result;
      };
      reader.onerror = function() { resolve(null); };
      reader.readAsDataURL(file);
    });
  };

  // 3. 同时并行处理三张图片，全部处理完后再统一保存
  Promise.all([
    processImage(leftAvFile),
    processImage(rightAvFile),
    processImage(bgFile)
  ]).then(function(results) {
    if (results[0]) cfg.leftAvatar = results[0];
    if (results[1]) cfg.rightAvatar = results[1];
    if (results[2]) cfg.bgImg = results[2];
    
    saveState();
    showToast('纪念日组件已保存');
    
    // 恢复按钮状态
    if (btn) {
      btn.disabled = false;
      btn.textContent = '保存';
    }
    
    navigateTo('pageHome');
    renderAppIcons(); 
  }).catch(function(err) {
    console.error('保存出错:', err);
    showToast('保存失败，请重试');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '保存';
    }
  });
}

function resetFriendWidget() {
  if (!confirm('确定要恢复默认设置吗？')) return;
  state.settings.friendWidget = null;
  saveState();
  navigateTo('pageHome');
  renderAppIcons();
  showToast('已恢复默认');
}

function checkSayWidgetCardUpdate() {
  var cfg = getSayWidgetConfig();
  var now = Date.now();
  var isFirstTime = !cfg.currentCard; // 如果当前没有字卡，就是第一次
  
  if (isFirstTime || (now - cfg.lastCardUpdate >= 5 * 60 * 1000)) {
    cfg.lastCardUpdate = now;
    
    if (isFirstTime || Math.random() < 0.5) {
      var cards = getUsableCards(state.currentChatId);
      if (cards.length > 0) {
        var randomCard = cards[Math.floor(Math.random() * cards.length)];
        cfg.currentCard = randomCard.text;
      }
    }
    saveState();
    
    var homePage = document.getElementById('pageHome');
    if (homePage && homePage.offsetParent !== null) {
      renderAppIcons();
    }
  }
}

// 启动定时器
checkSayWidgetCardUpdate();
setInterval(checkSayWidgetCardUpdate, 5 * 60 * 1000);

// ===== 朋友圈图片逻辑 =====
window._diaryImages = []; 
function handleDiaryImageSelect(e) {
  var files = e.target.files;
  if (!files || files.length === 0) return;
  if (window._diaryImages.length + files.length > 9) { showToast('最多只能选 9 张'); return; }
  var promises = [];
  for (var i = 0; i < files.length; i++) { promises.push(compressDiaryImage(files[i])); }
  Promise.all(promises).then(function(results) {
    results.forEach(function(base64) {
      if (base64 && window._diaryImages.length < 9) window._diaryImages.push(base64);
    });
    renderDiaryImagePreviews();
  });
  e.target.value = '';
}
function compressDiaryImage(file) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var MAX_WIDTH = 800;
        var w = img.width, h = img.height;
        if (w > MAX_WIDTH) { h *= MAX_WIDTH / w; w = MAX_WIDTH; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}
function renderDiaryImagePreviews() {
  var area = document.getElementById('diaryImagePreviewArea');
  if (!area) return;
  area.innerHTML = '';
  window._diaryImages.forEach(function(img, idx) {
    var div = document.createElement('div');
    div.style.cssText = 'position:relative; width:70px; height:70px; border-radius:8px; overflow:hidden;';
    div.innerHTML = '<img src="' + img + '" style="width:100%;height:100%;object-fit:cover;">' +
      '<span onclick="removeDiaryImage(' + idx + ')" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.6); color:#fff; width:18px; height:18px; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:12px; cursor:pointer;">×</span>';
    area.appendChild(div);
  });
  if (window._diaryImages.length < 9) {
    var addBtn = document.createElement('div');
    addBtn.style.cssText = 'width:70px; height:70px; background:var(--bg); border:1px dashed var(--border); border-radius:8px; display:flex; justify-content:center; align-items:center; font-size:24px; color:var(--gray); cursor:pointer;';
    addBtn.textContent = '+';
    addBtn.onclick = function() { document.getElementById('diaryImageInput').click(); };
    area.appendChild(addBtn);
  }
}
function removeDiaryImage(idx) { window._diaryImages.splice(idx, 1); renderDiaryImagePreviews(); }

// ===== 保存朋友圈（修复跳转桌面Bug） =====
function saveUserDiary() {
  if (window.event) window.event.preventDefault();
  try {
    var textEl = document.getElementById('diaryText');
    if (!textEl) return;
    var text = textEl.value.trim();
    if (!text && window._diaryImages.length === 0) { showToast('写点什么或加张图吧'); return; }
    
    if (!state.diaries) state.diaries = [];
    state.diaries.push({
      id: 'diary_' + Date.now(),
      authorId: 'user',
      authorName: state.profile.name || '我',
      authorAvatar: state.profile.avatar || '',
      text: text,
      images: window._diaryImages.slice(),
      likes: [],
      mood: pickedMood || MOODS[0],
      weather: pickedWeather || WEATHERS[0],
      time: Date.now(),
      comments: []
    });
    state.userDiaryLastDate = new Date().toISOString().slice(0, 10);
    saveState();
    
    textEl.value = '';
    window._diaryImages = [];
    renderDiaryImagePreviews();

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelector('.main-content').style.display = 'none';
    document.getElementById('pageWeChat').classList.add('active');
    switchWeChatTab('discover');
    showToast('发布成功');
  } catch (err) {
    console.error('发布朋友圈错误:', err);
    showToast('发布失败，请重试');
  }
}

// ===== 点赞逻辑 =====
function toggleLikeDiary(diaryId) {
  var diary = state.diaries.find(function(d) { return d.id === diaryId; });
  if (!diary) return;
  if (!diary.likes) diary.likes = [];
  if (!diary.likeTimes) diary.likeTimes = {};
  
  var idx = diary.likes.indexOf('user');
  if (idx > -1) {
    diary.likes.splice(idx, 1); 
    delete diary.likeTimes['user'];
  } else {
    diary.likes.push('user'); 
    diary.likeTimes['user'] = Date.now();
    triggerAiLikeDiary(diaryId);
  }
  saveState();
  renderDiaryList();
  updateDiaryBadges();
}

function triggerAiLikeDiary(diaryId) {
  if (!state.dreams || state.dreams.length === 0) return;
  var candidates = state.dreams.slice().sort(function() { return Math.random() - 0.5; }).slice(0, 2);
  candidates.forEach(function(dream) {
    setTimeout(function() {
      var diary = state.diaries.find(function(d) { return d.id === diaryId; });
      if (!diary || !diary.likes) return;
      if (diary.likes.indexOf(dream.id) === -1 && Math.random() < 0.6) {
        diary.likes.push(dream.id);
        if (!diary.likeTimes) diary.likeTimes = {};
        diary.likeTimes[dream.id] = Date.now(); // 记录时间
        saveState();
        updateDiaryBadges();
        // 如果当前正在朋友圈页面，重新渲染列表
        if (window._currentDiaryTabIsActive) {
          renderDiaryList();
        }
      }
    }, 1500 + Math.random() * 3000);
  });
}

// ===== 渲染朋友圈列表 =====
function renderDiaryList() {
  var container = document.getElementById('diaryList');
  if (!container) return;
  if (!state.diaries || state.diaries.length === 0) {
    container.innerHTML = '<div style="padding:60px 20px;text-align:center;color:var(--gray);font-size:14px;">还没有朋友圈，点右上角 ✎ 写下第一篇吧</div>';
    return;
  }

  var sorted = state.diaries.slice().sort(function(a, b) { return b.time - a.time; });

  container.innerHTML = sorted.map(function(d) {
    var t = new Date(d.time);
    var timeStr = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
    var dateStr = (t.getMonth() + 1) + '月' + t.getDate() + '日';
    
    var realAvatar = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2744%27 height=%2744%27 viewBox=%270 0 44 44%27%3E%3Ccircle cx=%2722%27 cy=%2722%27 r=%2722%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2722%27 y=%2727%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2718%27%3E💜%3C/text%3E%3C/svg%3E';
    if (d.authorId === 'user') {
      realAvatar = state.profile.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2744%27 height=%2744%27 viewBox=%270 0 44 44%27%3E%3Ccircle cx=%2722%27 cy=%2722%27 r=%2722%27 fill=%27%23e8e8ed%27/%3E%3Ctext x=%2722%27 y=%2727%27 text-anchor=%27middle%27 fill=%27%2386868b%27 font-size=%2718%27%3E👤%3C/text%3E%3C/svg%3E';
    } else {
      var dreamObj = state.dreams.find(function(x) { return x.id === d.authorId; });
      if (dreamObj && dreamObj.avatar) realAvatar = dreamObj.avatar;
    }

    var imagesHtml = '';
    if (d.images && d.images.length > 0) {
      if (d.images.length === 1) {
        imagesHtml = '<img src="' + d.images[0] + '" style="max-width:70%;max-height:200px;border-radius:8px;margin-top:8px;object-fit:cover;">';
      } else {
        imagesHtml = '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:4px;margin-top:8px;max-width:75%;">';
        d.images.forEach(function(img) {
          imagesHtml += '<img src="' + img + '" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:4px;">';
        });
        imagesHtml += '</div>';
      }
    }

    if (!d.likes) d.likes = [];
    var isLikedByMe = d.likes.indexOf('user') > -1;
    var likeNames = d.likes.map(function(id) {
      if (id === 'user') return state.profile.name || '我';
      var dd = state.dreams.find(function(x) { return x.id === id; });
      return dd ? dd.name : '梦角';
    });
    
    var likesHtml = '';
    if (likeNames.length > 0) {
      likesHtml = '<div style="background:#f7f7f7;padding:6px 10px;border-radius:6px;font-size:12px;color:#576b95;margin-top:8px;line-height:1.5;">' +
        '<span style="color:#d6336c;margin-right:4px;">❤️</span> ' + likeNames.join('，') + '</div>';
    }

    var commentsHtml = '';
    if (d.comments && d.comments.length > 0) {
      commentsHtml = '<div style="margin-top:8px;border-top:1px solid #f0f0f5;padding-top:8px;">';
      d.comments.forEach(function(c) {
        var cAvatar = state.profile.avatar || realAvatar;
        if (c.authorId !== 'user') {
          var cDream = state.dreams.find(function(x) { return x.id === c.authorId; });
          if (cDream && cDream.avatar) cAvatar = cDream.avatar;
        }
        // 【新增】：只有不是自己发的评论，才能点击回复
        var clickAttr = c.authorId !== 'user' ? ' onclick="replyToDiaryComment(\'' + d.id + '\', \'' + c.id + '\')" style="cursor:pointer;"' : '';
        commentsHtml += '<div style="display:flex;gap:6px;margin-bottom:6px;"' + clickAttr + '>';
        commentsHtml += '<img src="' + cAvatar + '" style="width:24px;height:24px;border-radius:4px;object-fit:cover;">';
        commentsHtml += '<div style="flex:1;font-size:13px;line-height:1.5;word-break:break-word;">';
        commentsHtml += '<span style="font-weight:600;color:#576b95;">' + escapeHtml(c.authorName) + '</span>';
        if (c.replyToName) commentsHtml += '<span style="color:var(--gray);"> 回复 </span><span style="font-weight:600;color:#576b95;">' + escapeHtml(c.replyToName) + '</span>';
        commentsHtml += '<span style="color:var(--text);margin-left:4px;">：' + escapeHtml(c.text) + '</span>';
        commentsHtml += '</div></div>';
      });
      commentsHtml += '</div>';
    }

    return '<div class="diary-item" style="align-items:flex-start;">' +
      '<img class="diary-item-avatar" src="' + realAvatar + '">' +
      '<div class="diary-item-body" style="flex:1;">' +
        '<div class="diary-item-name">' + escapeHtml(d.authorName) + '</div>' +
        '<div class="diary-item-content">' + escapeHtml(d.text) + '</div>' +
        imagesHtml +
        '<div class="diary-item-tags" style="margin-top:8px;">' +
          '<span>🌤 ' + d.weather + '</span>' +
          '<span>💭 ' + d.mood + '</span>' +
        '</div>' +
        '<div class="diary-item-foot">' +
          '<span class="diary-item-time">' + dateStr + ' ' + timeStr + '</span>' +
          '<span class="diary-item-del" onclick="deleteDiary(\'' + d.id + '\')">删除</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:flex-start;align-items:center;margin-top:6px;gap:12px;">' +
          '<span onclick="toggleLikeDiary(\'' + d.id + '\')" style="font-size:13px;color:#576b95;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">' + 
  (isLikedByMe 
    ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="#d6336c" stroke="#d6336c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg><span style="color:#d6336c;">取消</span>' 
    : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg><span>赞</span>') + 
'</span>' +
          '<span onclick="openDiaryComment(\'' + d.id + '\')" style="font-size:13px;color:#576b95;cursor:pointer;">💬 评论</span>' +
        '</div>' +
        likesHtml +
        commentsHtml +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== 梦角自动发朋友圈 (支持带图) =====
function checkAutoDiary() {
  if (!state.dreams || state.dreams.length === 0) return;
  if (!state.diaries) state.diaries = [];
  var now = Date.now();
  var SIX_HOURS = 6 * 60 * 60 * 1000;

  state.dreams.forEach(function(d) {
    var lastTime = 0;
    state.diaries.forEach(function(diary) {
      if (diary.authorId !== d.id) return;
      var t = parseInt((diary.id || '').split('_')[1]) || diary.time || 0;
      if (t > lastTime) lastTime = t;
    });

    if (now - lastTime < SIX_HOURS) return;
    if (Math.random() > 0.30) return;

        var usableCards = getUsableCards(d.id);
    if (!usableCards || usableCards.length === 0) return;
    var count = 3 + Math.floor(Math.random() * 6);
    var shuffled = usableCards.slice().sort(function() { return Math.random() - 0.5; });
    var picked = shuffled.slice(0, Math.min(count, shuffled.length));
    var text = picked.map(function(c) { return c.text; }).join('\n');

    var images = [];
    var allStickers = getAllStickers().map(function(x) { return x.data; }); 
    if (allStickers.length > 0 && Math.random() < 0.5) { 
      var imgCount = 1 + Math.floor(Math.random() * 9); 
      var shuffledStickers = allStickers.sort(function() { return Math.random() - 0.5; });
      images = shuffledStickers.slice(0, Math.min(imgCount, shuffledStickers.length));
    }

    var weather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
    var mood = MOODS[Math.floor(Math.random() * MOODS.length)];

    state.diaries.push({
      id: 'diary_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      authorId: d.id,
      authorName: d.name,
      authorAvatar: d.avatar || '',
      text: text,
      images: images,
      likes: [],      
      mood: mood,
      weather: weather,
      time: Date.now(),
      comments: []
    });
    saveState();
  });
}

// ===== 评论逻辑 (限制 0-5 条，允许自己评自己) =====
function checkAutoCommentOnDiary() {
  if (!state.diaries || state.diaries.length === 0) return;
  if (!state.dreams || state.dreams.length === 0) return;
  if (!state.cards || state.cards.length === 0) return;

  // 1% 概率主动评论
  if (Math.random() > 0.01) return;

  var now = Date.now();
  var ONE_DAY = 24 * 60 * 60 * 1000;
  // 只找 24 小时内的朋友圈
  var recent = state.diaries.filter(function(d) { return (now - d.time) < ONE_DAY; });
  if (recent.length === 0) return;

  var diary = recent[Math.floor(Math.random() * recent.length)];
  if (!diary.comments) diary.comments = [];

  state.dreams.forEach(function(dream) {
    var totalComments = diary.comments.filter(function(c) { return c.authorId === dream.id; }).length;
    if (totalComments >= 3) return; // 总数不超过3条
    if (Math.random() < 0.6) return; // 群体里再筛一下

    var dreamCards = getUsableCards(dream.id);
    var textCards = dreamCards.filter(function(c) {
      return c && c.text && typeof c.text === 'string' && c.text.length < 200 && c.text.indexOf('data:image') !== 0;
    });
    if (textCards.length === 0) return;

    var card = textCards[Math.floor(Math.random() * textCards.length)];
    diary.comments.push({
      id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      authorId: dream.id,
      authorName: dream.name,
      authorAvatar: dream.avatar || '',
      text: card.text,
      time: Date.now()
    });
  });
  saveState();
}

function triggerAiComment(diaryId, replyToAuthorId) {
  var diary = state.diaries.find(function(d) { return d.id === diaryId; });
  if (!diary) return;
  if (!state.dreams || state.dreams.length === 0) return;
  if (!state.cards || state.cards.length === 0) return;
  if (!diary.comments) diary.comments = [];

  var candidates = state.dreams; 
  if (candidates.length === 0) return;
  var dream = candidates[Math.floor(Math.random() * candidates.length)];

  var totalComments = diary.comments.filter(function(c) { return c.authorId === dream.id; }).length;
  if (totalComments >= 3) return; // 总数不超过3条

  var isReply = false;
  if (replyToAuthorId) {
    // 15% 概率回复
    if (Math.random() > 0.15) return; 
    isReply = true;

    // 【核心逻辑】每次只能回复一次：检查用户最后一条评论之后，梦角是否已经回复过
    var userComments = diary.comments.filter(function(c) { return c.authorId === 'user'; });
    if (userComments.length > 0) {
      var lastUserComment = userComments[userComments.length - 1];
      var hasReplied = diary.comments.some(function(c) {
        return c.authorId === dream.id && c.time > lastUserComment.time;
      });
      if (hasReplied) return; // 如果已经回复过了，直接终止！
    }
  } else {
    // 兜底：如果不是特定回复调用，就按 1% 概率
    if (Math.random() > 0.01) return; 
  }

  var dreamCards = getUsableCards(dream.id);
  var textCards = dreamCards.filter(function(c) {
    return c && c.text && typeof c.text === 'string' && c.text.length < 200 && c.text.indexOf('data:image') !== 0;
  });
  var card = textCards.length > 0 ? textCards[Math.floor(Math.random() * textCards.length)] : null;
  var text = card ? card.text : '……';

  var comment = {
    id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    authorId: dream.id,
    authorName: dream.name,
    authorAvatar: dream.avatar || '',
    text: text,
    time: Date.now()
  };

  if (isReply) {
    var others = diary.comments.filter(function(c) { return c.authorId !== dream.id; });
    if (others.length > 0) {
      var target = others[others.length - 1];
      comment.replyTo = target.id;
      comment.replyToName = target.authorName;
    }
  }

  diary.comments.push(comment);
  saveState();
  try { renderDiaryList(); } catch(e) {}
  try { updateDiaryBadges(); } catch(e) {} 
}

// ===== 朋友圈未读红点与提醒系统 =====
if (state.lastReadDiaryTime === undefined) state.lastReadDiaryTime = 0;

// 计算未读消息
function checkDiaryUnread() {
  if (!state.diaries) state.diaries = [];
  if (!state.lastReadDiaryPostTime) state.lastReadDiaryPostTime = 0;
  if (!state.lastReadDiaryInteractionTime) state.lastReadDiaryInteractionTime = 0;

  var newPosts = 0;
  var interactions = 0;
  var latestName = '';

  state.diaries.forEach(function(d) {
    // 1. 判断梦角发了新朋友圈（基于 postTime）
    if (d.authorId !== 'user' && d.time > state.lastReadDiaryPostTime) {
      newPosts++;
      latestName = d.authorName;
    }
    // 2. 判断梦角点赞或评论了我的朋友圈（基于 interactionTime）
    if (d.authorId === 'user') {
      if (d.comments) {
        d.comments.forEach(function(c) {
          if (c.authorId !== 'user' && c.time > state.lastReadDiaryInteractionTime) {
            interactions++;
            latestName = c.authorName;
          }
        });
      }
      if (d.likeTimes) {
        for (var id in d.likeTimes) {
          if (id !== 'user' && d.likeTimes[id] > state.lastReadDiaryInteractionTime) {
            interactions++;
            var dd = state.dreams.find(function(x) { return x.id === id; });
            if (dd) latestName = dd.name;
          }
        }
      }
    }
  });

  return { newPosts: newPosts, interactions: interactions, latestName: latestName };
}

// 更新红点和横幅 UI
function updateDiaryBadges() {
  var data = checkDiaryUnread();
  var dot = document.getElementById('discoverRedDot');
  var banner = document.getElementById('diaryNoticeBanner');
  var text = document.getElementById('diaryNoticeText');

  if (dot) {
    if (data.interactions > 0) {
      // 有互动，显示数字
      dot.style.display = 'block';
      dot.textContent = data.interactions > 99 ? '99+' : data.interactions;
      dot.style.minWidth = '16px';
      dot.style.height = '16px';
      dot.style.padding = '0 4px';
    } else if (data.newPosts > 0) {
      // 只有新帖子，显示纯小红点（无数字）
      dot.style.display = 'block';
      dot.textContent = '';
      dot.style.minWidth = '10px';
      dot.style.height = '10px';
      dot.style.padding = '0';
    } else {
      dot.style.display = 'none';
    }
  }

  if (banner) {
    if (data.interactions > 0 && window._currentDiaryTabIsActive) {
      banner.style.display = 'flex';
      text.textContent = data.latestName + ' 等赞了或评论了你的朋友圈';
    } else {
      banner.style.display = 'none';
    }
  }
}

// 标记为已读（点击横幅或进入朋友圈时触发）
function markDiaryAsRead() {
  state.lastReadDiaryInteractionTime = Date.now(); // 更新互动已读时间
  state.lastReadDiaryPostTime = Date.now(); // 顺便把新帖子的已读时间也更新了
  saveState();
  var banner = document.getElementById('diaryNoticeBanner');
  if (banner) banner.style.display = 'none';
  updateDiaryBadges();
  renderDiaryList();
}

// 打开新消息列表
function openDiaryNotifications() {
  // 1. 先渲染最新的未读消息
  renderDiaryNotifications();
  // 2. 标记为已读（更新最后阅读时间，这样下次就不会再显示这些旧的了）
  markDiaryAsRead();
  // 3. 跳转页面
  navigateTo('pageDiaryNotifications');
}

// 渲染点赞和评论列表
function renderDiaryNotifications() {
  var container = document.getElementById('diaryNotificationList');
  if (!container) return;
  
  if (!state.diaries || state.diaries.length === 0) {
    container.innerHTML = '<div style="padding:60px 20px;text-align:center;color:#86868b;font-size:14px;">暂无新消息</div>';
    return;
  }

  var notifications = [];
  var lastReadTime = state.lastReadDiaryInteractionTime || 0; // 上次点开的时间
  
  // 遍历所有朋友圈，收集梦角的点赞和评论
  state.diaries.forEach(function(d) {
    if (d.authorId !== 'user') return; // 只处理自己发的朋友圈
    
    // 收集评论（只收集时间比上次已读时间晚的）
    if (d.comments) {
      d.comments.forEach(function(c) {
        if (c.authorId !== 'user' && c.time > lastReadTime) {
          notifications.push({
            type: 'comment',
            time: c.time,
            authorName: c.authorName,
            authorAvatar: c.authorAvatar,
            text: c.text,
            diaryText: d.text ? (d.text.length > 10 ? d.text.slice(0,10) + '...' : d.text) : '[图片]',
            diaryId: d.id
          });
        }
      });
    }
    
    // 收集点赞（只收集时间比上次已读时间晚的）
    if (d.likeTimes) {
      for (var id in d.likeTimes) {
        if (id !== 'user' && d.likeTimes[id] > lastReadTime) {
          var dd = state.dreams.find(function(x) { return x.id === id; });
          notifications.push({
            type: 'like',
            time: d.likeTimes[id],
            authorName: dd ? dd.name : '梦角',
            authorAvatar: dd ? dd.avatar : '',
            text: '赞了你的朋友圈',
            diaryText: d.text ? (d.text.length > 10 ? d.text.slice(0,10) + '...' : d.text) : '[图片]',
            diaryId: d.id
          });
        }
      }
    }
  });

  // 按时间倒序排列
  notifications.sort(function(a, b) { return b.time - a.time; });
  
  if (notifications.length === 0) {
    container.innerHTML = '<div style="padding:60px 20px;text-align:center;color:#86868b;font-size:14px;">暂无新消息</div>';
    return;
  }

  container.innerHTML = notifications.map(function(n) {
    var avatar = n.authorAvatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%2720%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2720%27 y=%2725%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2716%27%3E💜%3C/text%3E%3C/svg%3E';
    var actionText = n.type === 'like' 
      ? '<span style="color:#576b95;font-weight:600;">赞了</span>你的朋友圈' 
      : '评论了你的朋友圈：<span style="color:#333;">' + escapeHtml(n.text) + '</span>';
      
    // 格式化时间（月-日 时:分）
    var dateObj = new Date(n.time);
    var m = String(dateObj.getMonth() + 1).padStart(2, '0');
    var day = String(dateObj.getDate()).padStart(2, '0');
    var h = String(dateObj.getHours()).padStart(2, '0');
    var min = String(dateObj.getMinutes()).padStart(2, '0');
    var timeStr = m + '-' + day + ' ' + h + ':' + min;
    
    return '<div style="display:flex; padding:12px 16px; border-bottom:1px solid #f0f0f5; background:#fff;">' +
      '<img src="' + avatar + '" style="width:40px; height:40px; border-radius:6px; object-fit:cover; margin-right:12px;">' +
      '<div style="flex:1; min-width:0;">' +
        // 这里加了 flex 布局，把名字和时间分列左右
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
          '<div style="font-size:14px; font-weight:600; color:#576b95;">' + escapeHtml(n.authorName) + '</div>' +
          '<div style="font-size:11px; color:#b0b0b5;">' + timeStr + '</div>' +
        '</div>' +
        '<div style="font-size:13px; color:#86868b; margin-bottom:6px; line-height:1.4;">' + actionText + '</div>' +
        '<div style="font-size:12px; color:#888; background:#f8f8fa; padding:4px 8px; border-radius:4px; display:inline-block; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(n.diaryText) + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== 回复梦角的评论 =====
function replyToDiaryComment(diaryId, commentId) {
  var diary = state.diaries.find(function(d) { return d.id === diaryId; });
  if (!diary || !diary.comments) return;
  
  // 找到你要回复的那条评论
  var targetComment = diary.comments.find(function(c) { return c.id === commentId; });
  if (!targetComment) return;

  // 弹出输入框
  var text = prompt('回复 ' + targetComment.authorName + '：');
  if (!text || !text.trim()) return;
  
  var now = Date.now();
  
  // 将你的回复加入评论列表
  diary.comments.push({
    id: 'cmt_' + now + '_' + Math.random().toString(36).slice(2, 6),
    authorId: 'user',
    authorName: state.profile.name || '我',
    authorAvatar: state.profile.avatar || '',
    text: text.trim(),
    time: now,
    replyTo: commentId, // 记录你回复的是哪条评论的ID
    replyToName: targetComment.authorName // 记录你回复的是谁
  });
  
  saveState();
  renderDiaryList();
  showToast('回复成功');

  // 70% 概率，梦角会再回复你（也就是跟你在评论区聊起来）
  if (Math.random() < 0.7) {
    setTimeout(function() {
      // 这里直接调用之前的 AI 评论函数，它会自动寻找最新的一条评论（也就是你刚发的）进行回复
      triggerAiComment(diaryId, 'user');
    }, 2000 + Math.random() * 3000);
  }
}

// ==========================================
// ===== 全局美化设置逻辑 =====
// ==========================================

// 处理全局壁纸
function handleGlobalWallpaper(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX_WIDTH = 1000, w = img.width, h = img.height;
      if (w > MAX_WIDTH) { h *= MAX_WIDTH / w; w = MAX_WIDTH; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      state.settings.globalWallpaper = canvas.toDataURL('image/jpeg', 0.7);
      saveState();
      applyGlobalWallpaper();
      showToast('全局壁纸已设置');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function resetGlobalWallpaper() {
  state.settings.globalWallpaper = null;
  saveState();
  applyGlobalWallpaper();
  showToast('已清除全局壁纸');
}

function applyGlobalWallpaper() {
  var bg = state.settings && state.settings.globalWallpaper;
  var pageWeChat = document.getElementById('pageWeChat');
  if (pageWeChat) {
    if (bg) {
      // 核心修复：去掉 fixed，使用 100% 100% 可能会拉长，所以用 cover 裁剪，或者用 100% auto。
      // 考虑到长图，这里用 cover 居中，或者使用 contain。为了填满屏幕且不拉伸，用 cover 最合适。
      pageWeChat.style.background = 'url(' + bg + ') no-repeat center center';
      pageWeChat.style.backgroundSize = 'cover'; 
      pageWeChat.classList.add('has-wallpaper');
    } else {
      pageWeChat.style.background = '#ededed';
      pageWeChat.style.backgroundSize = '';
      pageWeChat.classList.remove('has-wallpaper');
    }
  }
}

// 处理全局聊天背景
function handleGlobalChatBg(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX_WIDTH = 800, w = img.width, h = img.height;
      if (w > MAX_WIDTH) { h *= MAX_WIDTH / w; w = MAX_WIDTH; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      state.settings.globalChatBg = canvas.toDataURL('image/jpeg', 0.6);
      saveState();
      if (state.currentChatId) renderChat();
      showToast('全局聊天背景已设置');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function resetGlobalChatBg() {
  state.settings.globalChatBg = null;
  saveState();
  if (state.currentChatId) renderChat();
  showToast('已清除全局聊天背景');
}

// 初始化全局颜色和 CSS
function initGlobalSettingsUI() {
  if (!state.settings) state.settings = {};
  
  var elUser = document.getElementById('globalBubbleUserColor');
  var elDream = document.getElementById('globalBubbleDreamColor');
  var elFont = document.getElementById('globalFontColor');
  var elCSS = document.getElementById('globalChatCSS');
  
  if (elUser) elUser.value = state.settings.globalBubbleUser || '#e8e8ed';
  if (elDream) elDream.value = state.settings.globalBubbleDream || '#e8e8ed';
  if (elFont) elFont.value = state.settings.globalFontColor || '#1d1d1f';
  if (elCSS) elCSS.value = state.settings.globalChatCSS || '';

  if (elUser) elUser.onchange = function() { state.settings.globalBubbleUser = this.value; saveState(); if(state.currentChatId) renderChatMessages(); };
  if (elDream) elDream.onchange = function() { state.settings.globalBubbleDream = this.value; saveState(); if(state.currentChatId) renderChatMessages(); };
  if (elFont) elFont.onchange = function() { state.settings.globalFontColor = this.value; saveState(); if(state.currentChatId) renderChatMessages(); };
  if (elCSS) elCSS.onchange = function() { state.settings.globalChatCSS = this.value; saveState(); if(state.currentChatId) renderChatMessages(); };
}

function resetGlobalBubbleUser() { state.settings.globalBubbleUser = null; saveState(); initGlobalSettingsUI(); if(state.currentChatId) renderChatMessages(); }
function resetGlobalBubbleDream() { state.settings.globalBubbleDream = null; saveState(); initGlobalSettingsUI(); if(state.currentChatId) renderChatMessages(); }
function resetGlobalFontColor() { state.settings.globalFontColor = null; saveState(); initGlobalSettingsUI(); if(state.currentChatId) renderChatMessages(); }
function resetGlobalChatCSS() { state.settings.globalChatCSS = null; saveState(); initGlobalSettingsUI(); if(state.currentChatId) renderChatMessages(); }

// ==========================================
// ===== 日历功能核心逻辑 =====
// ==========================================
let currentCalMode = 'lunar';
let currentSelectedDate = new Date();

function toggleCalendarModeMenu() {
  const menu = document.getElementById('calendarModeMenu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function setCalendarMode(mode) {
  currentCalMode = mode;
  if (!state.settings) state.settings = {};
  state.settings.calMode = mode;
  saveState();
  
  document.getElementById('calendarModeText').textContent = mode === 'lunar' ? '农历模式' : '极简模式';
  
  const items = document.querySelectorAll('.cal-mode-item');
  items.forEach(el => el.classList.remove('active'));
  if (mode === 'lunar') items[1].classList.add('active');
  if (mode === 'minimal') items[0].classList.add('active');
  
  toggleCalendarModeMenu();
  renderCalendar();
}

function getFestival(y, m, d) {
  // 1. 公历固定节日
  const solarFestivals = {
    '1-1': '元旦', '2-14': '情人节', '3-8': '妇女节', '3-12': '植树节',
    '4-1': '愚人节', '5-1': '劳动节', '5-4': '青年节', '6-1': '儿童节',
    '7-1': '建党节', '8-1': '建军节', '9-10': '教师节', '10-1': '国庆节',
    '12-24': '平安夜', '12-25': '圣诞节'
  };
  
  if (solarFestivals[m + '-' + d]) return solarFestivals[m + '-' + d];
  if (m === 10 && d === 31) return '万圣夜';
  if (m === 11 && d === 1) return '万圣节';

  // 2. 农历节日智能识别
  try {
    let date = new Date(y, m - 1, d);
    // 格式化农历 (如: "正月初一", "八月十五")
    let lunarStr = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' }).format(date);
    
    // 将 "一月一" 或 "正月1" 这种统一转成标准格式
    lunarStr = lunarStr.replace('一月', '正月').replace('十一月', '冬月').replace('十二月', '腊月');
    
    const lunarFestivals = {
      '正月初一': '春节', '正月十五': '元宵节', '二月初二': '龙抬头',
      '五月初五': '端午节', '七月初七': '七夕', '七月十五': '中元节',
      '八月十五': '中秋节', '九月初九': '重阳节', '腊月初八': '腊八节',
      '腊月廿三': '小年', '腊月二十三': '小年'
    };

    // 处理不同浏览器返回的 "1" 和 "初一" 的格式差异
    let simpleLunar = lunarStr.replace(/初([一二三四五六七八九十])/g, '$1')
                             .replace('十', '十').replace('廿', '廿');
                             
    for (let key in lunarFestivals) {
      if (lunarStr.includes(key) || simpleLunar.includes(key.replace('初', ''))) {
        return lunarFestivals[key];
      }
    }
  } catch(e) {}

  return '';
}

function renderCalendar() {

if (state.settings && state.settings.calMode) {
    currentCalMode = state.settings.calMode;
  }
  var modeTextEl = document.getElementById('calendarModeText');
  if (modeTextEl) modeTextEl.textContent = currentCalMode === 'lunar' ? '农历模式' : '极简模式';
  
  const modeItems = document.querySelectorAll('.cal-mode-item');
  if (modeItems.length >= 2) {
    modeItems.forEach(el => el.classList.remove('active'));
    if (currentCalMode === 'lunar') modeItems[1].classList.add('active');
    else modeItems[0].classList.add('active');
  }

  const grid = document.getElementById('calendarGrid');
  if (!grid) return;

  const year = currentSelectedDate.getFullYear();
  const month = currentSelectedDate.getMonth() + 1;
  const today = new Date();

  document.getElementById('calYear').textContent = year;
  document.getElementById('calMonth').textContent = String(month).padStart(2, '0');

  const firstDay = new Date(year, month - 1, 1).getDay(); 
  const daysInMonth = new Date(year, month, 0).getDate(); 
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate(); 

  let html = '';
  
  // 1. 上个月的尾巴（灰色）
  for (let i = firstDay - 1; i >= 0; i--) {
    let d = daysInPrevMonth - i;
    html += `<div class="cal-cell" style="color:#ddd;">
      <div class="cal-date" style="color:#ddd;">${d}</div>
    </div>`;
  }

  // 2. 当月
  for (let i = 1; i <= daysInMonth; i++) {
    let isSelected = (year === currentSelectedDate.getFullYear() && month === currentSelectedDate.getMonth() + 1 && i === currentSelectedDate.getDate());
    let dayOfWeek = new Date(year, month - 1, i).getDay();
    let color = (dayOfWeek === 0 || dayOfWeek === 6) ? '#b0b0b5' : '#333';
    if (isSelected) color = '#fff';
    let bg = isSelected ? '#b0b0b5' : 'transparent';
    
    // 检查当天是否有日程
    let dateStrPrefix = `${year}-${String(month).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    let hasSch = state.schedules && state.schedules.some(s => s.startStr.startsWith(dateStrPrefix));
    let dotHtml = hasSch ? `<div style="width:4px; height:4px; background:#ccc; border-radius:50%; margin-top:2px;"></div>` : `<div style="height:6px;"></div>`;

    let festival = getFestival(year, month, i);
    let subText = festival;
    let subColor = '#b0b0b5'; 

        if (!festival && currentCalMode === 'lunar') {
      try {
        let dateObj = new Date(year, month - 1, i);
        let lunarFormatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'numeric', day: 'numeric' });
        let parts = lunarFormatter.formatToParts(dateObj);
        
        let lunarMonth = '';
        let lunarDay = '';
        for (let p of parts) {
          if (p.type === 'month') lunarMonth = p.value;
          if (p.type === 'day') lunarDay = p.value;
        }
        
        let dNum = parseInt(lunarDay);
        if (dNum) {
          if (dNum === 1) {
            // 初一显示月份（如：正月、九月）
            let monthNames = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
            let mNum = parseInt(lunarMonth);
            if (isNaN(mNum)) {
              // 兼容有些浏览器返回汉字月份的情况
              mNum = lunarMonth.includes('十一') ? 11 : (lunarMonth.includes('十二') ? 12 : 1);
            }
            subText = monthNames[mNum] ? monthNames[mNum] + '月' : '初一';
          } else {
            // 标准农历日子叫法
            const dayNames = ['', '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
            subText = dayNames[dNum] || '';
          }
          subColor = '#b0b0b5'; // 浅灰色
        } else {
          subText = '';
        }
      } catch(e) {
        subText = '';
      }
    }

    html += `<div class="cal-cell" onclick="selectCalDate(${i})">
      <div class="cal-date" style="color:${color}; background:${bg};">${i}</div>
      <div class="cal-lunar" style="color:${isSelected ? '#b0b0b5' : subColor}">${subText || ''}</div>
      ${dotHtml}
    </div>`;
  }

  // 3. 下个月的头部补齐
  const totalSlots = firstDay + daysInMonth;
  const remainder = totalSlots % 7;
  if (remainder !== 0) {
    for (let i = 1; i <= 7 - remainder; i++) {
      html += `<div class="cal-cell">
        <div class="cal-date" style="color:#ddd;">${i}</div>
      </div>`;
    }
  }

  grid.innerHTML = html;

  // 渲染下方日程列表
  renderCalendarScheduleList();
}

// ===== 新增：渲染日历下方的日程列表 =====
function renderCalendarScheduleList() {
  const listEl = document.getElementById('calendarScheduleList');
  if (!listEl) return;

  const year = currentSelectedDate.getFullYear();
  const month = currentSelectedDate.getMonth() + 1;
  const day = currentSelectedDate.getDate();
  const dateStrPrefix = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  // 找出这一天的日程
  let daySchedules = (state.schedules || []).filter(s => s.startStr.startsWith(dateStrPrefix));
  daySchedules.sort((a, b) => a.startTime - b.startTime);

  if (daySchedules.length === 0) {
    listEl.innerHTML = '<div style="text-align:center; color:#ccc; margin-top:40px; font-size:14px;">暂无日程</div>';
    return;
  }

  listEl.innerHTML = daySchedules.map(s => {
    // 找类型颜色
    const type = state.calendarTypes.find(t => t.id === s.typeId);
    const color = type ? type.color : '#007aff';

    // 提取时间 (15:00)
    const startH = s.startStr.split(' ')[1];
    let timeStr = startH;
    if (s.endStr) {
       const endH = s.endStr.split(' ')[1];
       timeStr = startH + '-' + endH;
    }

    // 计算倒计时
    let diff = s.startTime - Date.now();
    let countdown = '';
    if (diff > 0) {
      let mins = Math.floor(diff / 60000);
      if (mins < 60) countdown = mins + '分钟后开始';
      else countdown = Math.floor(mins / 60) + '小时后开始';
    } else if (s.endStr && Date.now() < new Date(s.endStr.replace(' ', 'T')).getTime()) {
      countdown = '进行中';
    } else {
      countdown = '已结束';
    }

    return `<div class="sch-item" onclick="openScheduleDetail('${s.id}')" style="cursor:pointer;">
      <div class="sch-dot" style="background:${color};"></div>
      <div class="sch-content">
        <div class="sch-title">${escapeHtml(s.name)}</div>
        ${s.isDreamAdd ? '<div style="font-size:11px; color:#007aff; margin-bottom:4px;">「' + escapeHtml(s.addedByName) + '」添加</div>' : ''}
        <div class="sch-time">
          <span>${timeStr}</span>
          <span>${countdown}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function selectCalDate(day) {
  currentSelectedDate.setDate(day);
  renderCalendar();
}

// 初始化日历
setTimeout(function() {
  if (document.getElementById('pageMemoList')) {
    renderCalendar();
  }
}, 500);

// ==========================================
// ===== 日程与日历扩展逻辑 =====
// ==========================================

// 初始化日程数据
if (!state.calendarTypes) {
  state.calendarTypes = [
    { id: 't1', name: '个人', color: '#007aff' },
    { id: 't2', name: '工作', color: '#ff3b30' },
    { id: 't3', name: '生日', color: '#ffcc00' }
  ];
}
if (!state.schedules) state.schedules = [];
let currentSelectedTypeId = 't1';
let currentRemindMinutes = 5;
let currentSchDreamId = '';

// 1. 打开新建日程
function openAddSchedule() {
  document.getElementById('schName').value = '';
  document.getElementById('schStartTime').value = '';
  document.getElementById('schEndTime').value = '';
  document.getElementById('schLocation').value = '';
  document.getElementById('schNote').value = '';
  currentSelectedTypeId = state.calendarTypes[0] ? state.calendarTypes[0].id : '';
  currentRemindMinutes = 5;
  currentSchDreamId = '';
  
  document.getElementById('schRemindTimeText').textContent = '5分钟前 >';
  document.getElementById('schDreamSelectRow').style.display = 'none';
  document.getElementById('schDreamNameText').textContent = '请选择 >';
  document.querySelector('input[name="schRemindWay"][value="notify"]').checked = true;

  // 👇 就是这里，加上重复的重置
  currentTempRepeatType = 'none';
  document.getElementById('schRepeatText').textContent = '一次性日程 >';

  renderSchTypes();
  navigateTo('pageAddSchedule');
}

// 渲染类型选择行
function renderSchTypes() {
  const row = document.getElementById('schTypeRow');
  row.innerHTML = state.calendarTypes.map(t => {
    const isSel = t.id === currentSelectedTypeId;
    return `<div onclick="currentSelectedTypeId='${t.id}'; renderSchTypes();" style="display:flex; align-items:center; gap:6px; cursor:pointer; flex-shrink:0;">
      <div style="width:20px; height:20px; border-radius:50%; background:${t.color}; display:flex; justify-content:center; align-items:center; color:#fff; font-size:12px;">${isSel ? '✓' : ''}</div>
      <span style="font-size:16px; color:#333;">${t.name}</span>
    </div>`;
  }).join('') + `<div onclick="navigateTo('pageManageTypes'); renderManageTypes();" style="margin-left:auto; cursor:pointer; font-size:20px; font-weight:bold; color:#333;">⋮</div>`;
}

// 监听提醒方式切换
document.addEventListener('change', function(e) {
  if (e.target.name === 'schRemindWay') {
    document.getElementById('schDreamSelectRow').style.display = e.target.value === 'dream' ? 'flex' : 'none';
  }
});

// 选择提醒时间
function openRemindTimePicker() {
  const val = prompt('提前多少分钟提醒？(请输入数字)', currentRemindMinutes);
  if (val !== null) {
    const mins = parseInt(val);
    if (!isNaN(mins) && mins >= 0) {
      currentRemindMinutes = mins;
      document.getElementById('schRemindTimeText').textContent = mins + '分钟前 >';
    }
  }
}

// 选择提醒梦角
function openSchDreamPicker() {
  if (!state.dreams || state.dreams.length === 0) { showToast('还没有梦角'); return; }
  const list = document.getElementById('schDreamPickerList');
  list.innerHTML = state.dreams.map(d => `
    <div onclick="selectSchDream('${d.id}', '${d.name}')" style="padding:12px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #f0f0f5; cursor:pointer;">
      <img src="${d.avatar || ''}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
      <span style="font-size:16px;">${d.name}</span>
    </div>
  `).join('');
  document.getElementById('schDreamPickerMask').style.display = 'block';
  document.getElementById('schDreamPickerPanel').style.display = 'block';
}

function selectSchDream(id, name) {
  currentSchDreamId = id;
  document.getElementById('schDreamNameText').textContent = name + ' >';
  document.getElementById('schDreamPickerMask').style.display = 'none';
  document.getElementById('schDreamPickerPanel').style.display = 'none';
}

// 保存日程
function saveNewSchedule() {
  const name = document.getElementById('schName').value.trim();
  const start = document.getElementById('schStartTime').value;
  const end = document.getElementById('schEndTime').value;
  const way = document.querySelector('input[name="schRemindWay"]:checked').value;

  if (!name) { showToast('请输入日程名称'); return; }
  if (!start) { showToast('请选择开始时间'); return; }
  if (way === 'dream' && !currentSchDreamId) { showToast('请选择提醒的梦角'); return; }

  const startTime = new Date(start).getTime();
  const remindAt = startTime - (currentRemindMinutes * 60 * 1000);

  const newSch = {
    id: 'sch_' + Date.now(),
    name: name,
    startStr: start.replace('T', ' '),
    endStr: end ? end.replace('T', ' ') : '',
    startTime: startTime,
    remindAt: remindAt,
    remindMinutes: currentRemindMinutes,
    typeId: currentSelectedTypeId,
    remindWay: way,
    dreamId: way === 'dream' ? currentSchDreamId : '',
    location: document.getElementById('schLocation').value.trim(),
    note: document.getElementById('schNote').value.trim(),
    repeatType: currentTempRepeatType, // 👈 这里把重复类型存进去
    status: 'pending',
    reminded: false
  };

  state.schedules.push(newSch);
  saveState();
  showToast('日程已保存');
  
  // 👇 保存后自动跳到那一天
  currentSelectedDate = new Date(newSch.startTime); 
  navigateTo('pageMemoList');
  renderCalendar();
}

// ==========================================
// ===== 类型管理 =====
// ==========================================
let currentEditTypeId = null;

function renderManageTypes() {
  const list = document.getElementById('manageTypesList');
  list.innerHTML = state.calendarTypes.map(t => `
    <div style="display:flex; align-items:center; gap:12px; padding: 16px 0; border-bottom:1px solid #f0f0f5;">
      <div style="width:24px; height:24px; border-radius:50%; background:#ff3b30; color:#fff; display:flex; justify-content:center; align-items:center; font-size:16px; cursor:pointer;" onclick="deleteTypeDirect('${t.id}')">−</div>
      <div style="width:16px; height:16px; border-radius:50%; background:${t.color}; margin-left:8px;"></div>
      <span style="font-size:18px; flex:1;">${t.name}</span>
      <div onclick="showTypeAction(event, '${t.id}')" style="color:#ccc; font-size:20px; cursor:pointer; padding:0 10px;">≡</div>
    </div>
  `).join('');
}

function showTypeAction(e, id) {
  e.stopPropagation();
  currentEditTypeId = id;
  const menu = document.getElementById('typeActionMenu');
  menu.style.display = 'block';
  menu.style.left = (e.clientX - 100) + 'px';
  menu.style.top = e.clientY + 'px';
  document.addEventListener('click', function hideMenu() {
    menu.style.display = 'none';
    document.removeEventListener('click', hideMenu);
  });
}

function openAddTypePrompt() {
  const name = prompt('输入新类型名称：');
  if (name && name.trim()) {
    state.calendarTypes.push({ id: 't_' + Date.now(), name: name.trim(), color: '#' + Math.floor(Math.random()*16777215).toString(16) });
    saveState();
    renderManageTypes();
  }
}

function editType() {
  const t = state.calendarTypes.find(x => x.id === currentEditTypeId);
  if (!t) return;
  const newName = prompt('修改类型名称：', t.name);
  if (newName && newName.trim()) {
    t.name = newName.trim();
    saveState();
    renderManageTypes();
  }
}

function deleteType() {
  if (!confirm('确定删除此类型吗？该类型下的日程不会被删除。')) return;
  state.calendarTypes = state.calendarTypes.filter(x => x.id !== currentEditTypeId);
  saveState();
  renderManageTypes();
}

function deleteTypeDirect(id) {
  if (!confirm('确定删除此类型吗？')) return;
  state.calendarTypes = state.calendarTypes.filter(x => x.id !== id);
  saveState();
  renderManageTypes();
}

// ==========================================
// ===== 日程定时提醒 =====
// ==========================================
setInterval(checkSchedules, 10000); // 每10秒检查一次

function checkSchedules() {
  if (!state.schedules || state.schedules.length === 0) return;
  const now = Date.now();
  let changed = false;

  state.schedules.forEach(sch => {
    if (sch.status !== 'pending' || sch.reminded) return;
    
    // 如果当前时间超过了提醒时间，且还没提醒过
    if (now >= sch.remindAt) {
      sch.reminded = true;
      changed = true;

      if (sch.remindWay === 'notify') {
        sendNotification('日程提醒', sch.name + ' 即将开始');
      } else if (sch.remindWay === 'dream' && sch.dreamId) {
        // 梦角提醒
        const dream = state.dreams.find(d => d.id === sch.dreamId);
        if (dream) {
          const packetId = 'sch_' + Date.now();
          const packet = {
            from: 'dream',
            type: 'schedule',
            packetId: packetId,
            schId: sch.id,
            dreamId: dream.id,
            dreamName: dream.name,
            title: sch.name,
            timeStr: sch.startStr,
            time: Date.now()
          };
          
          if (!state.chatSessions[dream.id]) state.chatSessions[dream.id] = [];
          state.chatSessions[dream.id].push(packet);
          
          if (state.currentChatId === dream.id) {
            loadChatMessages();
            renderChatMessages();
          }
          sendNotification(dream.name, '提醒你「' + sch.name + '」');
          try { renderChatList(); updateAppIconBadges(); } catch(e) {}
        }
      }
    }
  });

  if (changed) saveState();
}

// 日程卡片的“稍后提醒”
function schCardLater(packetId) {
  const packet = findSchedulePacket(packetId);
  if (!packet) return;
  const sch = state.schedules.find(s => s.id === packet.schId);
  if (!sch) return;
  
  sch.status = 'pending';
  sch.reminded = false;
  sch.remindAt = Date.now() + 5 * 60 * 1000; 
  
  packet.cardStatus = 'later'; // 记录状态
  saveState();
  showToast('5分钟后将再次提醒');
  loadChatMessages();
  renderChatMessages();
}

// 日程卡片的“知道了”
function schCardDone(packetId) {
  const packet = findSchedulePacket(packetId);
  if (!packet) return;
  const sch = state.schedules.find(s => s.id === packet.schId);
  if (sch) {
    sch.status = 'done';
  }
  
  packet.cardStatus = 'done'; // 记录状态
  saveState();
  showToast('已关闭提醒');
  loadChatMessages();
  renderChatMessages();
}

function closeSchCard(packetId) {
  const packet = findSchedulePacket(packetId);
  if (packet) {
    // 从消息中删除或在界面上隐藏
    packet.removed = true;
    if (state.currentChatId) {
      const msgs = state.chatSessions[state.currentChatId];
      const idx = msgs.indexOf(packet);
      if (idx > -1) {
        msgs[idx].type = 'system';
        msgs[idx].text = '日程提醒已处理';
        saveState();
        loadChatMessages();
        renderChatMessages();
      }
    }
  }
}

function findSchedulePacket(packetId) {
  for (let cid in state.chatSessions) {
    const msgs = state.chatSessions[cid];
    for (let i = 0; i < msgs.length; i++) {
      if (msgs[i].packetId === packetId) return msgs[i];
    }
  }
  return null;
}

// ==========================================
// ===== 日程详情与编辑核心逻辑 =====
// ==========================================
let currentDetailSchId = null;
let currentEditTypeId2 = null;
let currentEditRemindMinutes = 5;
let currentEditSchDreamId = '';

// 1. 打开详情页
function openScheduleDetail(schId) {
  currentDetailSchId = schId;
  const sch = state.schedules.find(s => s.id === schId);
  if (!sch) return;

  document.getElementById('schDetailTitle').textContent = sch.name;

  var dreamTag = document.getElementById('schDetailDreamTag');
  if (sch.isDreamAdd) {
    dreamTag.style.display = 'block';
    dreamTag.textContent = '由「' + sch.addedByName + '」添加';
  } else {
    dreamTag.style.display = 'none';
  }
  
  const startDate = new Date(sch.startTime);
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const today = new Date();
  let dateStr = '';
  if (startDate.toDateString() === today.toDateString()) dateStr = '今天';
  else if (startDate.getFullYear() === today.getFullYear()) dateStr = (startDate.getMonth()+1) + '月' + startDate.getDate() + '日';
  else dateStr = startDate.getFullYear() + '年' + (startDate.getMonth()+1) + '月' + startDate.getDate() + '日';
  document.getElementById('schDetailDate').textContent = dateStr + ' ' + weekDays[startDate.getDay()];

  const startH = sch.startStr.split(' ')[1];
  let timeStr = startH;
  if (sch.endStr) timeStr += ' 至 ' + sch.endStr.split(' ')[1];
  document.getElementById('schDetailTime').textContent = timeStr;

  let diff = sch.startTime - Date.now();
  let countdown = '';
  if (diff > 0) {
    let mins = Math.floor(diff / 60000);
    if (mins < 60) countdown = mins + '分钟后开始';
    else countdown = Math.floor(mins / 60) + '小时后开始';
  } else if (sch.endStr && Date.now() < new Date(sch.endStr.replace(' ', 'T')).getTime()) {
    countdown = '进行中';
  } else {
    countdown = '已结束';
  }
  document.getElementById('schDetailCountdown').textContent = countdown;

  const type = state.calendarTypes.find(t => t.id === sch.typeId);
  if (type) {
    document.getElementById('schDetailTypeDot').style.background = type.color;
    document.getElementById('schDetailTypeName').textContent = type.name;
  } else {
    document.getElementById('schDetailTypeDot').style.background = '#ccc';
    document.getElementById('schDetailTypeName').textContent = '无';
  }

  document.getElementById('schDetailRemindTime').textContent = (sch.remindMinutes || 5) + '分钟前';

  let wayStr = '通知提醒';
  if (sch.remindWay === 'dream') {
    const d = state.dreams.find(dr => dr.id === sch.dreamId);
    wayStr = '梦角提醒 (' + (d ? d.name : '未知') + ')';
  }
  document.getElementById('schDetailRemindWay').textContent = wayStr;

  var detailBody = document.querySelector('#pageScheduleDetail .page-body > div > div');
  var oldLoc = document.getElementById('schDetailLocRow');
  if (oldLoc) oldLoc.remove();
  var oldNote = document.getElementById('schDetailNoteRow');
  if (oldNote) oldNote.remove();
  
  if (sch.location) {
    var locRow = document.createElement('div');
    locRow.id = 'schDetailLocRow';
    locRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding: 16px 0; border-bottom:1px solid #f0f0f5;';
    locRow.innerHTML = '<span style="font-size:16px;">地点</span><span style="font-size:15px; color:#86868b;">' + escapeHtml(sch.location) + '</span>';
    document.getElementById('schDetailRemindWay').parentNode.parentNode.parentNode.appendChild(locRow);
  }
  if (sch.note) {
    var noteRow = document.createElement('div');
    noteRow.id = 'schDetailNoteRow';
    noteRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding: 16px 0; border-bottom:1px solid #f0f0f5;';
    noteRow.innerHTML = '<span style="font-size:16px;">备注</span><span style="font-size:15px; color:#86868b; max-width:60%; text-align:right;">' + escapeHtml(sch.note) + '</span>';
    document.getElementById('schDetailRemindWay').parentNode.parentNode.parentNode.appendChild(noteRow);
  }

  navigateTo('pageScheduleDetail');
}

// 2. 打开编辑页
function openEditSchedule() {
  if (!currentDetailSchId) { showToast('数据丢失，请重新点开'); return; }
  const sch = state.schedules.find(s => s.id === currentDetailSchId);
  if (!sch) { showToast('找不到该日程'); return; }

  document.getElementById('editSchName').value = sch.name || '';
  if (sch.startStr) document.getElementById('editSchStartTime').value = sch.startStr.replace(' ', 'T');
  if (sch.endStr) document.getElementById('editSchEndTime').value = sch.endStr.replace(' ', 'T');
  document.getElementById('editSchLocation').value = sch.location || '';
  document.getElementById('editSchNote').value = sch.note || '';
  
  currentEditTypeId2 = sch.typeId;
  currentEditRemindMinutes = sch.remindMinutes || 5;
  currentEditSchDreamId = sch.dreamId || '';

  document.getElementById('editSchRemindTimeText').textContent = currentEditRemindMinutes + '分钟前 >';
  
  const type = state.calendarTypes.find(t => t.id === currentEditTypeId2);
  if (type) {
    document.getElementById('editSchTypeDot').style.background = type.color;
    document.getElementById('editSchTypeName').textContent = type.name;
  }

  const wayInput = document.querySelector(`input[name="editSchRemindWay"][value="${sch.remindWay || 'notify'}"]`);
  if (wayInput) wayInput.checked = true;
  document.getElementById('editSchDreamSelectRow').style.display = sch.remindWay === 'dream' ? 'flex' : 'none';
  
  if (sch.remindWay === 'dream' && sch.dreamId) {
    const d = state.dreams.find(dr => dr.id === sch.dreamId);
    document.getElementById('editSchDreamNameText').textContent = (d ? d.name : '请选择') + ' >';
  } else {
    document.getElementById('editSchDreamNameText').textContent = '请选择 >';
  }

  currentTempRepeatType = sch.repeatType || 'none';
  let editBaseDate = sch.startTime ? new Date(sch.startTime) : new Date();
  let repeatTextEl = document.getElementById('editSchRepeatText');
  if (repeatTextEl) {
    repeatTextEl.textContent = getRepeatOptionsText(currentTempRepeatType, editBaseDate) + ' >';
  }

  navigateTo('pageEditSchedule');
}

// 监听编辑页的提醒方式切换
document.addEventListener('change', function(e) {
  if (e.target.name === 'editSchRemindWay') {
    document.getElementById('editSchDreamSelectRow').style.display = e.target.value === 'dream' ? 'flex' : 'none';
  }
});

// 3. 选择类型
function openEditSchTypePicker() {
  const list = document.getElementById('typePickerList');
  list.innerHTML = state.calendarTypes.map(t => `
    <div onclick="selectEditType('${t.id}', '${t.name}', '${t.color}')" style="padding:12px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #f0f0f5; cursor:pointer;">
      <div style="width:16px; height:16px; border-radius:50%; background:${t.color};"></div>
      <span style="font-size:16px;">${t.name}</span>
    </div>
  `).join('');
  document.getElementById('typePickerMask').style.display = 'block';
  document.getElementById('typePickerPanel').style.display = 'block';
}

function selectEditType(id, name, color) {
  currentEditTypeId2 = id;
  document.getElementById('editSchTypeDot').style.background = color;
  document.getElementById('editSchTypeName').textContent = name;
  document.getElementById('typePickerMask').style.display = 'none';
  document.getElementById('typePickerPanel').style.display = 'none';
}

// 4. 选择提醒时间
function openEditRemindTimePicker() {
  const val = prompt('提前多少分钟提醒？(请输入数字)', currentEditRemindMinutes);
  if (val !== null) {
    const mins = parseInt(val);
    if (!isNaN(mins) && mins >= 0) {
      currentEditRemindMinutes = mins;
      document.getElementById('editSchRemindTimeText').textContent = mins + '分钟前 >';
    }
  }
}

// 5. 选择梦角
function openEditSchDreamPicker() {
  if (!state.dreams || state.dreams.length === 0) { showToast('还没有梦角'); return; }
  const list = document.getElementById('schDreamPickerList');
  list.innerHTML = state.dreams.map(d => `
    <div onclick="selectEditSchDream('${d.id}', '${d.name}')" style="padding:12px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #f0f0f5; cursor:pointer;">
      <img src="${d.avatar || ''}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
      <span style="font-size:16px;">${d.name}</span>
    </div>
  `).join('');
  document.getElementById('schDreamPickerMask').style.display = 'block';
  document.getElementById('schDreamPickerPanel').style.display = 'block';
}

function selectEditSchDream(id, name) {
  currentEditSchDreamId = id;
  document.getElementById('editSchDreamNameText').textContent = name + ' >';
  document.getElementById('schDreamPickerMask').style.display = 'none';
  document.getElementById('schDreamPickerPanel').style.display = 'none';
}

// 6. 保存编辑
function saveEditedSchedule() {
  const sch = state.schedules.find(s => s.id === currentDetailSchId);
  if (!sch) return;

  const name = document.getElementById('editSchName').value.trim();
  const start = document.getElementById('editSchStartTime').value;
  const end = document.getElementById('editSchEndTime').value;
  const way = document.querySelector('input[name="editSchRemindWay"]:checked').value;

  if (!name) { showToast('请输入日程名称'); return; }
  if (!start) { showToast('请选择开始时间'); return; }
  if (way === 'dream' && !currentEditSchDreamId) { showToast('请选择提醒的梦角'); return; }

  sch.name = name;
  sch.startStr = start.replace('T', ' ');
  sch.endStr = end ? end.replace('T', ' ') : '';
  sch.startTime = new Date(start).getTime();
  sch.remindMinutes = currentEditRemindMinutes;
  sch.remindAt = sch.startTime - (currentEditRemindMinutes * 60 * 1000);
  sch.typeId = currentEditTypeId2;
  sch.remindWay = way;
  sch.dreamId = way === 'dream' ? currentEditSchDreamId : '';
  sch.location = document.getElementById('editSchLocation').value.trim();
  sch.note = document.getElementById('editSchNote').value.trim();
  sch.repeatType = currentTempRepeatType; // 👈 这里把修改后的重复类型存进去
  
  sch.status = 'pending';
  sch.reminded = false;

  saveState();
  showToast('修改已保存');
  
  openScheduleDetail(sch.id);
  renderCalendar();
}

// 7. 删除
function deleteScheduleFromDetail() {
  if (!confirm('确定要删除这个日程吗？')) return;
  state.schedules = state.schedules.filter(s => s.id !== currentDetailSchId);
  saveState();
  showToast('日程已删除');
  navigateTo('pageMemoList');
  renderCalendar();
}

function deleteScheduleFromEdit() {
  if (!confirm('确定要删除这个日程吗？')) return;
  state.schedules = state.schedules.filter(s => s.id !== currentDetailSchId);
  saveState();
  showToast('日程已删除');
  navigateTo('pageMemoList');
  renderCalendar();
}

// ==========================================
// ===== 重复（Repeat）功能核心逻辑 =====
// ==========================================
let currentTempRepeatType = 'none';

function getRepeatOptionsText(type, dateObj) {
  const w = ['周日','周一','周二','周三','周四','周五','周六'][dateObj.getDay()];
  const d = dateObj.getDate();
  const m = dateObj.getMonth() + 1;
  const nth = Math.ceil(d / 7); // 第几个周x
  const nthNames = ['第一个', '第二个', '第三个', '第四个', '第五个'];

  switch(type) {
    case 'none': return '一次性日程';
    case 'daily': return '每天';
    case 'weekdays': return '工作日（周一至周五）';
    case 'weekly': return `每周（${w}）`;
    case 'monthly_date': return `每月（${d}日）`;
    case 'monthly_nth_weekday': return `每月（${nthNames[nth-1] || '最后一个'}${w}）`;
    case 'monthly_last_day': return '每月底（公历每月最后一日）';
    case 'yearly': return `每年（${m}月${d}日）`;
    case 'lunar_yearly':
      try {
        let lunarStr = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' }).format(dateObj);
        return `农历每年（${lunarStr}）`;
      } catch(e) { return '农历每年'; }
    default: return '一次性日程';
  }
}

function openRepeatPicker(returnPage) {
  window._repeatReturnPage = returnPage;
  let baseDate = new Date();
  
  const inputId = returnPage === 'pageAddSchedule' ? 'schStartTime' : 'editSchStartTime';
  const inputEl = document.getElementById(inputId);
  const val = inputEl ? inputEl.value : '';
  if (val) baseDate = new Date(val);

  const types = ['none', 'daily', 'weekdays', 'weekly', 'monthly_date', 'monthly_nth_weekday', 'monthly_last_day', 'yearly', 'lunar_yearly'];
  
  let html = '';
  types.forEach(t => {
    const isSel = currentTempRepeatType === t;
    html += `
      <div onclick="selectRepeatType('${t}')" style="display:flex; justify-content:space-between; align-items:center; padding: 16px 0; border-bottom:1px solid #f0f0f5; cursor:pointer;">
        <span style="font-size:16px; color:#1d1d1f;">${getRepeatOptionsText(t, baseDate)}</span>
        <div style="width:22px; height:22px; border-radius:50%; border:2px solid ${isSel ? '#007aff' : '#e5e5ea'}; background:${isSel ? '#007aff' : 'transparent'}; display:flex; justify-content:center; align-items:center;">
          ${isSel ? '<div style="width:8px; height:8px; border-radius:50%; background:#fff;"></div>' : ''}
        </div>
      </div>
    `;
  });

  html += `
    <div style="display:flex; justify-content:space-between; align-items:center; padding: 16px 0; margin-top:20px; cursor:pointer;">
      <span style="font-size:16px; color:#1d1d1f;">自定义</span>
      <span style="color:#ccc; font-size:18px;">›</span>
    </div>
  `;

  document.getElementById('repeatOptionsList').innerHTML = html;
  navigateTo('pageRepeatPicker');
}

function selectRepeatType(type) {
  currentTempRepeatType = type;
  let baseDate = new Date();
  
  const inputId = window._repeatReturnPage === 'pageAddSchedule' ? 'schStartTime' : 'editSchStartTime';
  const inputEl = document.getElementById(inputId);
  const val = inputEl ? inputEl.value : '';
  if (val) baseDate = new Date(val);

  const text = getRepeatOptionsText(type, baseDate);
  
  if (window._repeatReturnPage === 'pageAddSchedule') {
    let el = document.getElementById('schRepeatText');
    if (el) el.textContent = text + ' >';
  } else {
    let el = document.getElementById('editSchRepeatText');
    if (el) el.textContent = text + ' >';
  }
  
  navigateTo(window._repeatReturnPage || 'pageAddSchedule');
}

// ==========================================
// ===== 日历右上角菜单逻辑 =====
// ==========================================

function toggleCalActionMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('calActionMenu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// 点击空白处关闭菜单
document.addEventListener('click', function(e) {
  const menu = document.getElementById('calActionMenu');
  if (menu && menu.style.display === 'block') {
    if (!menu.contains(e.target)) {
      menu.style.display = 'none';
    }
  }
});

// 1. 日期跳转
function openDateJump() {
  document.getElementById('calActionMenu').style.display = 'none';
  const input = prompt('请输入要跳转的日期 (格式: 2026-10-26 或 2026/10/26)：');
  if (!input) return;
  
  const parsedDate = new Date(input.replace(/-/g, '/'));
  if (isNaN(parsedDate.getTime())) {
    showToast('日期格式有误，请重新输入');
    return;
  }
  
  currentSelectedDate = parsedDate;
  renderCalendar();
  showToast('已跳转至 ' + input);
}

// 2. 导出日程
function exportScheduleData() {
  document.getElementById('calActionMenu').style.display = 'none';
  if (!state.schedules || state.schedules.length === 0) {
    showToast('当前没有日程可导出');
    return;
  }
  
  const data = {
    schedules: state.schedules,
    calendarTypes: state.calendarTypes,
    exportAt: new Date().toISOString(),
    version: 1
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Mind_日程备份_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  showToast('日程已导出');
}

// 3. 导入日程
function handleImportSchedule(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.schedules || !Array.isArray(data.schedules)) {
        showToast('文件格式错误');
        return;
      }
      
      let addedCount = 0;
      let existingIds = state.schedules.map(s => s.id);
      
      // 合并日程
      data.schedules.forEach(sch => {
        if (!existingIds.includes(sch.id)) {
          state.schedules.push(sch);
          addedCount++;
        }
      });
      
      // 合并类型（如果导入文件里有新类型）
      if (data.calendarTypes && Array.isArray(data.calendarTypes)) {
        let existingTypeIds = state.calendarTypes.map(t => t.id);
        data.calendarTypes.forEach(t => {
          if (!existingTypeIds.includes(t.id)) {
            state.calendarTypes.push(t);
          }
        });
      }
      
      saveState();
      renderCalendar();
      showToast('成功导入 ' + addedCount + ' 条日程');
      
    } catch(err) {
      showToast('解析失败，请确认是有效的备份文件');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// 4. 美化 (占位)
function openCalBeautify() {
  document.getElementById('calActionMenu').style.display = 'none';
  showToast('日历美化开发中，敬请期待...');
}

// ==========================================
// ===== 梦角自动添加日程逻辑 =====
// ==========================================

function checkAutoDreamSchedule() {
  if (!state.dreams || state.dreams.length === 0) return;
  if (!state.cards || state.cards.length === 0) return;

  var now = new Date();
  var todayStr = now.toISOString().slice(0, 10);

  state.dreams.forEach(function(dream) {
    // 每天最多加一条日程，且 30% 概率触发
    var lastSchDate = dream.lastScheduleDate || '';
    if (lastSchDate === todayStr) return;
    if (Math.random() > 0.30) return;

    // 获取该梦角的专属字卡
    var usableCards = getUsableCards(dream.id);
    if (!usableCards || usableCards.length === 0) return;

    // 辅助函数：随机抽 1-3 张字卡拼接
    var getRandomText = function() {
      var count = 1 + Math.floor(Math.random() * 3);
      var shuffled = usableCards.slice().sort(function() { return Math.random() - 0.5; });
      var picked = shuffled.slice(0, count);
      return picked.map(function(c) { return c.text; }).join('，');
    };

    var name = getRandomText();
    
    // 地点和备注 50% 概率填写
    var location = Math.random() < 0.5 ? getRandomText() : '';
    var note = Math.random() < 0.5 ? getRandomText() : '';

       // 👇 限制日程只能在【本月内】生成
    var now = new Date();
    var currentYear = now.getFullYear();
    var currentMonth = now.getMonth();
    var todayDate = now.getDate();
    
    // 获取本月总天数
    var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // 距离本月底还有几天
    var remainDays = daysInMonth - todayDate;
    
    // 如果今天是本月最后一天，没日子可选了，就不加了
    if (remainDays <= 0) return;

    // 随机天数：1 到 剩余天数 之间
    var randomDays = 1 + Math.floor(Math.random() * remainDays);
    var randomHour = 9 + Math.floor(Math.random() * 12); // 9点-21点
    var randomMin = Math.random() < 0.5 ? 0 : 30;
    
    var targetDate = todayDate + randomDays;
    var startDate = new Date(currentYear, currentMonth, targetDate, randomHour, randomMin);
    
    var durationMins = (1 + Math.floor(Math.random() * 2)) * 60;
    var endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);
    
    // 兜底：如果结束时间不小心跨到了下个月，强行截断到本月最后一天的 23:59
    var endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    if (endDate > endOfMonth) {
      endDate = endOfMonth;
    }

    var pad = function(n) { return n < 10 ? '0' + n : n; };
    var startStr = startDate.getFullYear() + '-' + pad(startDate.getMonth()+1) + '-' + pad(startDate.getDate()) + ' ' + pad(startDate.getHours()) + ':' + pad(startDate.getMinutes());
    var endStr = endDate.getFullYear() + '-' + pad(endDate.getMonth()+1) + '-' + pad(endDate.getDate()) + ' ' + pad(endDate.getHours()) + ':' + pad(endDate.getMinutes());

    var type = state.calendarTypes[Math.floor(Math.random() * state.calendarTypes.length)];

    var newSch = {
      id: 'sch_dream_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: name,
      startStr: startStr,
      endStr: endStr,
      startTime: startDate.getTime(),
      remindAt: 0,
      remindMinutes: 0,
      typeId: type ? type.id : 't1',
      remindWay: 'none', // 梦角添加的日程不提醒
      dreamId: dream.id,
      location: location,
      note: note,
      repeatType: 'none',
      status: 'pending',
      reminded: true, // 标记为已提醒，不触发系统通知
      isDreamAdd: true, // 👈 标记这是梦角加的
      addedByName: dream.name
    };

    state.schedules.push(newSch);
    dream.lastScheduleDate = todayStr;

    // 给梦角私聊发一条系统小字
    if (!state.chatSessions[dream.id]) state.chatSessions[dream.id] = [];
    state.chatSessions[dream.id].push({
      from: 'system',
      text: '「' + dream.name + '」添加了一条新的日程：' + name,
      time: Date.now()
    });

    // 如果在当前聊天界面，刷新一下
    if (state.currentChatId === dream.id) {
      loadChatMessages();
      renderChatMessages();
    }
  });

  saveState();
  try { renderCalendar(); } catch(e) {}
  try { renderChatList(); } catch(e) {}
}

// 定时触发：每 6 小时检查一次
setInterval(checkAutoDreamSchedule, 6 * 60 * 60 * 1000);
setTimeout(checkAutoDreamSchedule, 5000); // 启动 5 秒后先跑一次

function changeCalMonth(offset) {
  // 获取当前的年份和月份
  var year = currentSelectedDate.getFullYear();
  var month = currentSelectedDate.getMonth();
  
  // 切换月份：把当前选中的日期设为新月份的 1 号
  var newDate = new Date(year, month + offset, 1);
  currentSelectedDate = newDate;
  
  // 重新渲染日历
  renderCalendar();
}

// ==========================================
// ===== 梦角情绪词库 =====
// ==========================================
const DREAM_EMOTIONS = [
  '开心', '激动', '伤心', '难过', '生气', '平静', '害羞', '期待', 
  '害怕', '惊讶', '无语', '疲惫', '宠溺', '温柔', '委屈', '傲娇', 
  '冷酷', '兴奋', '焦虑', '感动', '心虚', '得意', '疑惑', '纠结', 
  '满足', '失落', '深情', '慌张', '调侃', '无奈', '紧张', '心疼',
  '心动', '吃醋', '思念', '安心', '崩溃', '暗爽', '敷衍', '认真'
];

// ==========================================
// ===== 小纸条功能核心逻辑 =====
// ==========================================

// 全局弹窗展示完整文本
window.showTextModal = function(data) {
  var old = document.getElementById('_paperTextModal');
  if(old) old.remove();
  
  var mainText = typeof data === 'string' ? data : data.drawnText;
  var suppText = typeof data === 'object' ? data.supplement : null;
  
  var suppHtml = '';
  if (suppText) {
    suppHtml = `<div style="margin-top:12px; padding:10px; background:rgba(0,122,255,0.08); border:1px dashed rgba(0,122,255,0.3); border-radius:8px; font-size:13px; color:var(--blue); line-height:1.5;">
      <div style="font-size:11px; font-weight:600; opacity:0.8; margin-bottom:4px;">梦角补充：</div>
      ${escapeHtml(suppText)}
    </div>`;
  }

  var m = document.createElement('div');
  m.id = '_paperTextModal';
  m.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
  m.innerHTML = `<div style="background:var(--card);width:100%;max-width:320px;border-radius:16px;padding:20px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;box-shadow:0 10px 30px rgba(0,0,0,0.2);">
    <div style="font-size:15px;font-weight:600;color:var(--text);text-align:center;">完整内容</div>
    <div style="font-size:14px;line-height:1.6;color:var(--text);max-height:40vh;overflow-y:auto;word-break:break-word;background:var(--bg);padding:12px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(mainText)}</div>
    ${suppHtml}
    <button onclick="this.parentNode.parentNode.remove()" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--blue);color:#fff;font-size:15px;cursor:pointer;margin-top:4px;">关闭</button>
  </div>`;
  
  document.body.appendChild(m);
};

function renderPaperPage() {
  if (!state.paperRounds) state.paperRounds = {};
  if (!state.paperHistory) state.paperHistory = [];
  if (state.currentPaperDreamId === undefined) state.currentPaperDreamId = null;
  
  var grid = document.getElementById('paperGrid');
  if (!grid) {
    setTimeout(renderPaperPage, 50);
    return;
  }

  renderPaperDreamSelector();
  renderPaperRound();
}

function renderPaperDreamSelector() {
  var current = state.dreams.find(d => d.id === state.currentPaperDreamId);
  if (!current && state.dreams.length > 0) {
    current = state.dreams[0];
    state.currentPaperDreamId = current.id;
  }
  
  var avatarEl = document.getElementById('paperAvatar');
  var nameEl = document.getElementById('paperDreamName');
  var statusEl = document.getElementById('paperDreamStatus');
  if (!avatarEl || !nameEl || !statusEl) return;

  if (current) {
    avatarEl.style.backgroundImage = current.avatar ? `url(${current.avatar})` : '';
    avatarEl.textContent = current.avatar ? '' : (current.name ? current.name.charAt(0) : '梦');
    nameEl.textContent = current.name || '未命名';
    statusEl.textContent = current.currentStatus || '在线';
  } else {
    avatarEl.style.backgroundImage = '';
    avatarEl.textContent = '梦';
    nameEl.textContent = '未设置';
    statusEl.textContent = '去添加梦角';
  }

  var listEl = document.getElementById('paperDreamDropdownList');
  if (listEl) {
    listEl.innerHTML = state.dreams.map(function(d) {
      var isActive = d.id === state.currentPaperDreamId;
      var av = d.avatar ? `background-image:url(${d.avatar});background-size:cover;` : '';
      var avText = d.avatar ? '' : (d.name ? d.name.charAt(0) : '梦');
      return `<div onclick="switchPaperDream('${d.id}')" style="display:flex; align-items:center; padding:12px; border-bottom:1px solid var(--border); cursor:pointer; ${isActive ? 'background:var(--bg);' : ''}">
        <div class="avatar-circle" style="${av} width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; margin-right:10px;">${avText}</div>
        <div style="flex:1; min-width:0; display:flex; flex-direction:column;">
          <div style="font-size:14px; font-weight:600; color:var(--text); text-align:left;">${d.name}</div>
          <div style="font-size:11px; color:var(--gray); margin-top:2px; text-align:left;">${d.currentStatus || '无状态'}</div>
        </div>
      </div>`;
    }).join('');
  }
}

function switchPaperDream(id) {
  state.currentPaperDreamId = id;
  saveState();
  renderPaperDreamSelector();
  renderPaperRound();
  var dd = document.getElementById('paperDreamDropdown');
  if (dd) dd.style.display = 'none';
}

document.addEventListener('click', function(e) {
  var sel = document.getElementById('paperDreamSelector');
  var dd = document.getElementById('paperDreamDropdown');
  
  if (sel && sel.contains(e.target)) {
    if (dd) {
      dd.style.display = (dd.style.display === 'none' || dd.style.display === '') ? 'block' : 'none';
    }
    e.stopPropagation();
  } else if (dd && !dd.contains(e.target)) {
    dd.style.display = 'none';
  }
});

function renderPaperRound() {
  var grid = document.getElementById('paperGrid');
  var prompt = document.getElementById('paperPromptDisplay');
  if (!grid) return;
  
  var dreamId = state.currentPaperDreamId;
  if (!dreamId) {
    grid.innerHTML = '';
    prompt.innerHTML = '请先在上方选择或去添加一个梦角';
    return;
  }
  
  var roundData = state.paperRounds[dreamId];
  if (!roundData) {
    prompt.innerHTML = '输入一句话，开始抽取纸条吧！';
    grid.innerHTML = '';
    return;
  }
  
  if (roundData.userInput) {
    prompt.innerHTML = '你说：<span>' + escapeHtml(roundData.userInput) + '</span>';
  } else {
    prompt.innerHTML = '输入一句话，开始抽取纸条吧！';
  }
  
  if (!roundData.cards || roundData.cards.length === 0) {
    grid.innerHTML = '';
    return;
  }
  
  var html = '';
  roundData.cards.forEach(function(text, index) {
    var isFlipped = (index === roundData.flippedIndex);
    var isDisabled = (roundData.flippedIndex !== -1) ? ' disabled' : '';
    html += `<div class="paper-card ${isFlipped ? 'flipped' : ''}${isDisabled}" data-index="${index}" onclick="handleFlipCard(${index})">
      <div class="paper-inner">
        <div class="paper-back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 22a10 10 0 0 1-10-10"/></svg></div>
        <div class="paper-front">${text}</div>
      </div>
    </div>`;
  });
  grid.innerHTML = html;
}

function sendPaperMsg() {
  var dreamId = state.currentPaperDreamId;
  if (!dreamId) return showToast('请先选择梦角');
  
  var input = document.getElementById('paperInput');
  var text = input.value.trim();
  if (!text) return showToast('请先输入一句话');
  
  var usableCards = (state.cards || []).filter(function(c) {
    if (c.blocked) return false;
    var cat = state.categories.find(x => x.id === c.cat);
    if (cat && cat.blocked) return false;
    return true;
  });
  
  if (usableCards.length === 0) {
    return showToast('字卡库是空的！请先去“字卡”页面添加字卡。');
  }
  
  document.getElementById('paperPromptDisplay').innerHTML = '';
  document.getElementById('paperGrid').innerHTML = '';
  var loadingEl = document.getElementById('paperLoading');
  if (loadingEl) loadingEl.style.display = 'flex';
  input.value = '';
  
  var delayMs = (0.8 + Math.random() * 0.7) * 1000;
  
  setTimeout(function() {
    var pickedTexts = [];
    var pool = usableCards.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = pool[i]; pool[i] = pool[j]; pool[j] = temp;
    }
    for (var k = 0; k < 6; k++) {
      pickedTexts.push(pool.length > 0 ? pool[k % pool.length].text : '…');
    }
    
    if (!state.paperRounds) state.paperRounds = {};
    if (!state.paperHistory) state.paperHistory = [];
    
    state.paperRounds[dreamId] = { userInput: text, cards: pickedTexts, flippedIndex: -1 };
    
    // 写入历史记录
        // 写入历史记录
    var newHistoryItem = {
      id: 'ph_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      dreamId: dreamId,
      time: Date.now(),
      userInput: text,
      cards: pickedTexts,
      flippedIndex: -1,
      dreamSupplement: null,
      supplementDueAt: Date.now() + 2 * 60 * 1000 // 2分钟后梦角会补充
    };
    state.paperHistory.push(newHistoryItem);
    state._currentPaperHistoryId = newHistoryItem.id; // 标记当前抽的是哪一条
    
    saveState();
    
    if (loadingEl) loadingEl.style.display = 'none';
    renderPaperRound();
  }, delayMs);
}

function handleFlipCard(index) {
  var dreamId = state.currentPaperDreamId;
  if (!dreamId) return;
  var roundData = state.paperRounds[dreamId];
  if (!roundData) return;
  if (roundData.flippedIndex !== -1) return;
  if (!roundData.cards || !roundData.cards[index]) return;
  
  roundData.flippedIndex = index;
  
  // 同步更新历史记录里的翻开状态
  if (state._currentPaperHistoryId && state.paperHistory) {
    var hItem = state.paperHistory.find(x => x.id === state._currentPaperHistoryId);
    if (hItem) hItem.flippedIndex = index;
  }
  
  saveState();
  renderPaperRound();
  if (navigator.vibrate) navigator.vibrate(50);
}

// ===== 小纸条历史记录逻辑 =====

var paperHistoryEditMode = false;
var paperHistorySelected = [];

function openPaperHistory() {
  paperHistoryEditMode = false;
  paperHistorySelected = [];
  
  var dateInput = document.getElementById('paperHistoryDate');
  if (dateInput && !dateInput.value) {
    var now = new Date();
    dateInput.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }
  
  var dreamSelect = document.getElementById('paperHistoryDream');
  if (dreamSelect) {
    dreamSelect.innerHTML = '<option value="all">全部梦角</option>' + state.dreams.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    if (state.currentPaperDreamId) {
      dreamSelect.value = state.currentPaperDreamId;
    } else {
      dreamSelect.value = 'all';
    }
  }
  
  updatePaperHistoryEditUI();
  renderPaperHistory();
  navigateTo('pagePaperHistory');
}

function renderPaperHistory() {
  var container = document.getElementById('paperHistoryList');
  if (!container) return;
  
  var dateVal = document.getElementById('paperHistoryDate').value;
  var dreamVal = document.getElementById('paperHistoryDream').value;
  
  if (!state.paperHistory) state.paperHistory = [];
  
  var filtered = state.paperHistory.filter(function(item) {
    var itemDate = new Date(item.time);
    var itemDateStr = itemDate.getFullYear() + '-' + String(itemDate.getMonth() + 1).padStart(2, '0') + '-' + String(itemDate.getDate()).padStart(2, '0');
    var matchDate = (itemDateStr === dateVal);
    var matchDream = (dreamVal === 'all' || item.dreamId === dreamVal);
    return matchDate && matchDream;
  });
  
  filtered.sort((a, b) => b.time - a.time);
  
  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:var(--gray); padding:40px 20px; font-size:14px;">这一天没有记录哦</div>';
    return;
  }
  
  window._paperHistoryData = {};
  var html = '';
  
  filtered.forEach(function(item) {
    var isSelected = paperHistorySelected.indexOf(item.id) > -1;
    
    var t = new Date(item.time);
    var timeStr = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
    var drawnText = (item.flippedIndex !== -1 && item.cards[item.flippedIndex]) ? item.cards[item.flippedIndex] : '未翻开';
    
    var dreamObj = state.dreams.find(d => d.id === item.dreamId);
    var dreamName = dreamObj ? dreamObj.name : '未知梦角';
    
    // 存入弹窗数据（包含补充内容）
    window._paperHistoryData[item.id] = {
      drawnText: drawnText,
      supplement: item.dreamSupplement
    };
    
    var suppHtml = '';
    if (item.dreamSupplement) {
      suppHtml = `<div class="ph-supplement" style="pointer-events:none;">
        <span class="ph-supplement-label">「${dreamName}」补充：</span>
        <span>${escapeHtml(item.dreamSupplement)}</span>
      </div>`;
    }

    html += `<div class="paper-history-item ${isSelected ? 'selected' : ''}" onclick="handlePaperHistoryClick('${item.id}')">
      ${paperHistoryEditMode ? `<div class="paper-history-checkbox ${isSelected ? 'checked' : ''}">${isSelected ? '✓' : ''}</div>` : ''}
      <div style="flex:1; min-width:0;">
        <div class="ph-time">${timeStr} · ${dreamName}</div>
        <div class="ph-input">${escapeHtml(item.userInput)}</div>
        <div class="ph-card" style="pointer-events:none;">${escapeHtml(drawnText)}</div>
        ${suppHtml}
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

function togglePaperHistoryEdit() {
  paperHistoryEditMode = !paperHistoryEditMode;
  if (!paperHistoryEditMode) paperHistorySelected = [];
  updatePaperHistoryEditUI();
  renderPaperHistory();
}

function updatePaperHistoryEditUI() {
  var btn = document.getElementById('paperHistoryEditBtn');
  var bar = document.getElementById('paperHistoryBottomBar');
  if (btn) btn.textContent = paperHistoryEditMode ? '完成' : '编辑';
  if (bar) bar.style.display = paperHistoryEditMode ? 'flex' : 'none';
}

function togglePaperHistorySelect(id) {
  var idx = paperHistorySelected.indexOf(id);
  if (idx > -1) paperHistorySelected.splice(idx, 1);
  else paperHistorySelected.push(id);
  renderPaperHistory();
}

function selectAllPaperHistory() {
  var dateVal = document.getElementById('paperHistoryDate').value;
  var dreamVal = document.getElementById('paperHistoryDream').value;
  
  if (!state.paperHistory) state.paperHistory = [];
  var filtered = state.paperHistory.filter(function(item) {
    var itemDate = new Date(item.time);
    var itemDateStr = itemDate.getFullYear() + '-' + String(itemDate.getMonth() + 1).padStart(2, '0') + '-' + String(itemDate.getDate()).padStart(2, '0');
    var matchDate = (itemDateStr === dateVal);
    var matchDream = (dreamVal === 'all' || item.dreamId === dreamVal);
    return matchDate && matchDream;
  });
  
  if (paperHistorySelected.length === filtered.length) {
    paperHistorySelected = [];
  } else {
    paperHistorySelected = filtered.map(x => x.id);
  }
  renderPaperHistory();
}

function deleteSelectedPaperHistory() {
  if (paperHistorySelected.length === 0) return showToast('请先选择要删除的记录');
  if (!confirm('确定删除选中的 ' + paperHistorySelected.length + ' 条记录吗？')) return;
  
  state.paperHistory = state.paperHistory.filter(item => paperHistorySelected.indexOf(item.id) === -1);
  paperHistorySelected = [];
  paperHistoryEditMode = false;
  updatePaperHistoryEditUI();
  saveState();
  renderPaperHistory();
  showToast('已删除');
}

// ===== 小纸条梦角补充检测 =====
function checkPaperSupplements() {
  if (!state.paperHistory || state.paperHistory.length === 0) return;
  var now = Date.now();
  var changed = false;
  
  // 获取可用的字卡
  var usableCards = (state.cards || []).filter(function(c) {
    if (c.blocked) return false;
    var cat = state.categories.find(x => x.id === c.cat);
    if (cat && cat.blocked) return false;
    return true;
  });

  state.paperHistory.forEach(function(item) {
    // 如果到了时间且还没有补充过
    if (item.supplementDueAt && now >= item.supplementDueAt && item.dreamSupplement === null) {
      if (Math.random() < 0.7 && usableCards.length > 0) {
        // 70%概率补充一句字卡内容
        item.dreamSupplement = usableCards[Math.floor(Math.random() * usableCards.length)].text;
      } else {
        // 30%概率啥也不说
        item.dreamSupplement = ''; 
      }
      item.supplementDueAt = null;
      changed = true;
    }
  });

  if (changed) {
    saveState();
    // 如果当前在历史记录页面，实时刷新一下
    var pageHistory = document.getElementById('pagePaperHistory');
    if (pageHistory && pageHistory.classList.contains('active')) {
      renderPaperHistory();
    }
  }
}
setInterval(checkPaperSupplements, 60 * 1000);
setTimeout(checkPaperSupplements, 5000); // 启动5秒后跑一次

// ==========================================
// ===== 小纸条设置面板核心逻辑 =====
// ==========================================

function getPaperSettings() {
  if (!state.paperSettings) {
    state.paperSettings = { bg: '', cardBg: '', minDelay: 0.8, maxDelay: 1.5 };
  }
  return state.paperSettings;
}

window.openPaperSettings = function() {
  var cfg = getPaperSettings();
  document.getElementById('psMinDelay').value = cfg.minDelay;
  document.getElementById('psMaxDelay').value = cfg.maxDelay;
  document.getElementById('paperSettingsModal').classList.add('show');
};

window.closePaperSettings = function() {
  document.getElementById('paperSettingsModal').classList.remove('show');
};

window.handlePaperBgUpload = function(e, type) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX = 800;
      var w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
      else { if (h > MAX) { w *= MAX / h; h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var data = canvas.toDataURL('image/jpeg', 0.7);
      
      var cfg = getPaperSettings();
      if (type === 'page') cfg.bg = data;
      if (type === 'card') cfg.cardBg = data;
      saveState();
      applyPaperSettings();
      showToast('图片已更新');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
};

window.clearPaperBg = function(type) {
  var cfg = getPaperSettings();
  if (type === 'page') cfg.bg = '';
  if (type === 'card') cfg.cardBg = '';
  saveState();
  applyPaperSettings();
  showToast('已清除背景');
};

window.savePaperSettings = function() {
  var cfg = getPaperSettings();
  var minV = parseFloat(document.getElementById('psMinDelay').value) || 0.8;
  var maxV = parseFloat(document.getElementById('psMaxDelay').value) || 1.5;
  if (minV < 0.1) minV = 0.1;
  if (maxV < minV) maxV = minV;
  
  cfg.minDelay = minV;
  cfg.maxDelay = maxV;
  saveState();
  closePaperSettings();
  applyPaperSettings();
  showToast('设置已保存');
};

// 应用背景设置
function applyPaperSettings() {
  var cfg = getPaperSettings();
  var pageNote = document.getElementById('pageNote');
  
  if (pageNote) {
    if (cfg.bg) {
      pageNote.classList.add('has-paper-bg');
      pageNote.style.backgroundImage = `url(${cfg.bg})`;
      pageNote.style.backgroundColor = 'transparent'; // 让图片透出来
    } else {
      pageNote.classList.remove('has-paper-bg');
      pageNote.style.backgroundImage = '';
      pageNote.style.backgroundColor = 'var(--bg)';
    }
  }
  
  // 重新渲染纸条以应用卡片背景
  renderPaperRound();
}

// 修改 renderPaperRound 以应用卡片背景图
var _originalRenderPaperRound = renderPaperRound;
renderPaperRound = function() {
  var cfg = getPaperSettings();
  var grid = document.getElementById('paperGrid');
  var prompt = document.getElementById('paperPromptDisplay');
  if (!grid) return;
  
  var dreamId = state.currentPaperDreamId;
  if (!dreamId) {
    grid.innerHTML = '';
    prompt.innerHTML = '请先在上方选择或去添加一个梦角';
    return;
  }
  
  var roundData = state.paperRounds[dreamId];
  if (!roundData) {
    prompt.innerHTML = '输入一句话，开始抽取纸条吧！';
    grid.innerHTML = '';
    return;
  }
  
  if (roundData.userInput) {
    prompt.innerHTML = '你说：<span>' + escapeHtml(roundData.userInput) + '</span>';
  } else {
    prompt.innerHTML = '输入一句话，开始抽取纸条吧！';
  }
  
  if (!roundData.cards || roundData.cards.length === 0) {
    grid.innerHTML = '';
    return;
  }
  
  var html = '';
  roundData.cards.forEach(function(text, index) {
    var isFlipped = (index === roundData.flippedIndex);
    var isDisabled = (roundData.flippedIndex !== -1) ? ' disabled' : '';
    
    // 判断是否使用自定义背景
    var customBgClass = cfg.cardBg ? ' custom-paper-bg' : '';
    var customStyle = cfg.cardBg ? `background-image:url(${cfg.cardBg});` : '';
    
    html += `<div class="paper-card${customBgClass} ${isFlipped ? 'flipped' : ''}${isDisabled}" data-index="${index}" onclick="handleFlipCard(${index})">
      <div class="paper-inner">
        <div class="paper-back" style="${customStyle}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 22a10 10 0 0 1-10-10"/></svg></div>
        <div class="paper-front">${text}</div>
      </div>
    </div>`;
  });
  grid.innerHTML = html;
};

// 修改 sendPaperMsg 以应用自定义延迟时间
var _originalSendPaperMsg = sendPaperMsg;
sendPaperMsg = function() {
  var dreamId = state.currentPaperDreamId;
  if (!dreamId) return showToast('请先选择梦角');
  
  var input = document.getElementById('paperInput');
  var text = input.value.trim();
  if (!text) return showToast('请先输入一句话');
  
  var usableCards = (state.cards || []).filter(function(c) {
    if (c.blocked) return false;
    var cat = state.categories.find(x => x.id === c.cat);
    if (cat && cat.blocked) return false;
    return true;
  });
  
  if (usableCards.length === 0) {
    return showToast('字卡库是空的！请先去“字卡”页面添加字卡。');
  }
  
  document.getElementById('paperPromptDisplay').innerHTML = '';
  document.getElementById('paperGrid').innerHTML = '';
  var loadingEl = document.getElementById('paperLoading');
  if (loadingEl) loadingEl.style.display = 'flex';
  input.value = '';
  
  // 读取自定义延迟
  var cfg = getPaperSettings();
  var minS = parseFloat(cfg.minDelay) || 0.8;
  var maxS = parseFloat(cfg.maxDelay) || 1.5;
  if (maxS < minS) maxS = minS;
  var delayMs = (minS + Math.random() * (maxS - minS)) * 1000;
  
  setTimeout(function() {
    var pickedTexts = [];
    var pool = usableCards.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = pool[i]; pool[i] = pool[j]; pool[j] = temp;
    }
    for (var k = 0; k < 6; k++) {
      pickedTexts.push(pool.length > 0 ? pool[k % pool.length].text : '…');
    }
    
    if (!state.paperRounds) state.paperRounds = {};
    if (!state.paperHistory) state.paperHistory = [];
    
    state.paperRounds[dreamId] = { userInput: text, cards: pickedTexts, flippedIndex: -1 };
    
    var newHistoryItem = {
      id: 'ph_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      dreamId: dreamId,
      time: Date.now(),
      userInput: text,
      cards: pickedTexts,
      flippedIndex: -1,
      dreamSupplement: null,
      supplementDueAt: Date.now() + 2 * 60 * 1000
    };
    state.paperHistory.push(newHistoryItem);
    state._currentPaperHistoryId = newHistoryItem.id;
    
    saveState();
    
    if (loadingEl) loadingEl.style.display = 'none';
    renderPaperRound();
  }, delayMs);
};

// 在页面跳转时自动应用背景
var _originalRenderPaperPage = renderPaperPage;
renderPaperPage = function() {
  if (!state.paperRounds) state.paperRounds = {};
  if (!state.paperHistory) state.paperHistory = [];
  if (state.currentPaperDreamId === undefined) state.currentPaperDreamId = null;
  
  var grid = document.getElementById('paperGrid');
  if (!grid) {
    setTimeout(renderPaperPage, 50);
    return;
  }

  renderPaperDreamSelector();
  applyPaperSettings(); // 应用背景
  renderPaperRound();
};

// ==========================================
// ===== 手账系统 核心逻辑 (最终无冲突版) =====
// ==========================================

if (!state.scrapbooks) state.scrapbooks = [];

let sbEditMode = false;
let sbSelectedIds = [];
let currentSbId = null;
let tempSbImages = { front: null, side: null, back: null };
let currentSbObj = null;   
let currentSbPageIdx = 0;  
let currentSbSide = 'left';

// ===== 全局变量声明（只声明一次） =====
var sbCanvas, sbCtx, sbBgCanvas, sbBgCtx;
var isDrawing = false;
var sbCurrentPath = [];
var sbUndoStack = [];
var sbRedoStack = [];
var currentSbTool = 'brush';

// 页面初始化跳转拦截
var _originalNavigateTo = navigateTo;
navigateTo = function(pageId) {
  if (pageId === 'pageNotebook') {
    _originalNavigateTo('pageScrapbook');
    renderScrapbookList();
  } else {
    _originalNavigateTo(pageId);
  }
};

// ===== 1. 列表页 =====
function renderScrapbookList() {
  var grid = document.getElementById('scrapbookGrid');
  if (!grid) return;

  if (state.scrapbooks.length === 0) {
    grid.innerHTML = `
      <div class="sb-card sb-card-empty" onclick="openScrapbookEdit(null)">
        <span style="font-size:40px; color:#ccc; font-weight:300;">+</span>
        <span style="font-size:13px; color:var(--gray); margin-top:8px;">新建手账</span>
      </div>
    `;
    document.getElementById('scrapbookEditBtn').style.display = 'none';
    return;
  }

  document.getElementById('scrapbookEditBtn').style.display = 'block';

  var html = '';
  state.scrapbooks.forEach(function(sb) {
    var isSelected = sbSelectedIds.indexOf(sb.id) > -1;
    var coverImg = sb.frontImg || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27150%27 viewBox=%270 0 100 150%27%3E%3Crect width=%27100%27 height=%27150%27 fill=%27%23eee%27/%3E%3Ctext x=%2750%27 y=%2780%27 text-anchor=%27middle%27 fill=%27%23aaa%27 font-size=%2712%27%3E无封面%3C/text%3E%3C/svg%3E';
    
    html += `
      <div class="sb-card ${sbEditMode ? 'sb-edit-mode' : ''}" onclick="handleSbCardClick('${sb.id}', event)">
        <img class="sb-card-img" src="${coverImg}">
        <div class="sb-card-title">${sb.name || (sb.ownerName + '的手账')}</div>
        <div class="sb-card-checkbox ${isSelected ? 'checked' : ''}">${isSelected ? '✓' : ''}</div>
      </div>
    `;
  });

  if (!sbEditMode && state.scrapbooks.length > 0) {
    html += `
      <div class="sb-card sb-card-empty" onclick="openScrapbookEdit(null)">
        <span style="font-size:40px; color:#ccc; font-weight:300;">+</span>
      </div>
    `;
  }
  grid.innerHTML = html;
}

function toggleScrapbookEdit() {
  var btn = document.getElementById('scrapbookEditBtn');
  if (sbEditMode) {
    if (sbSelectedIds.length > 0) {
      if (confirm('确定删除选中的 ' + sbSelectedIds.length + ' 个手账吗？此操作不可恢复！')) {
        state.scrapbooks = state.scrapbooks.filter(sb => sbSelectedIds.indexOf(sb.id) === -1);
        saveState();
        sbSelectedIds = []; sbEditMode = false;
        btn.textContent = '编辑'; btn.style.color = 'var(--blue)';
        renderScrapbookList();
        showToast('手账已删除');
      }
    } else {
      sbEditMode = false;
      btn.textContent = '编辑'; btn.style.color = 'var(--blue)';
      renderScrapbookList();
    }
  } else {
    sbEditMode = true; sbSelectedIds = [];
    btn.textContent = '删除'; btn.style.color = 'var(--red)';
    renderScrapbookList();
  }
}

function handleSbCardClick(id, e) {
  if (e) e.stopPropagation();
  if (sbEditMode) {
    var idx = sbSelectedIds.indexOf(id);
    if (idx > -1) sbSelectedIds.splice(idx, 1);
    else sbSelectedIds.push(id);
    renderScrapbookList();
  } else {
    openScrapbookView(id);
  }
}

function openScrapbookEdit(id) {
  currentSbId = id;
  
  // 👇 新增：动态填充手账主人下拉框（用户 + 所有梦角）
  var ownerSel = document.getElementById('sbOwnerSelect');
  if (ownerSel) {
    var opts = '<option value="user">我（用户）</option>';
    (state.dreams || []).forEach(function(d) {
      opts += '<option value="' + d.id + '">' + d.name + '</option>';
    });
    ownerSel.innerHTML = opts;
  }
  
  var titleEl = document.getElementById('scrapbookEditTitle');
  tempSbImages = { front: null, side: null, back: null };
  document.getElementById('sbFrontPreview').style.display = 'none';
  document.getElementById('sbSidePreview').style.display = 'none';
  document.getElementById('sbBackPreview').style.display = 'none';
  document.getElementById('sbFrontIcon').style.display = 'block';
  document.getElementById('sbSideIcon').style.display = 'block';
  document.getElementById('sbBackIcon').style.display = 'block';
  document.getElementById('sbNameInput').value = '';

  if (id) {
    var sb = state.scrapbooks.find(x => x.id === id);
    if (sb) {
      titleEl.textContent = '编辑手账';
      document.getElementById('sbNameInput').value = sb.name || '';
      if (sb.frontImg) {
        tempSbImages.front = sb.frontImg;
        document.getElementById('sbFrontPreview').src = sb.frontImg;
        document.getElementById('sbFrontPreview').style.display = 'block';
        document.getElementById('sbFrontIcon').style.display = 'none';
      }
      if (sb.sideImg) {
        tempSbImages.side = sb.sideImg;
        document.getElementById('sbSidePreview').src = sb.sideImg;
        document.getElementById('sbSidePreview').style.display = 'block';
        document.getElementById('sbSideIcon').style.display = 'none';
      }
      if (sb.backImg) {
        tempSbImages.back = sb.backImg;
        document.getElementById('sbBackPreview').src = sb.backImg;
        document.getElementById('sbBackPreview').style.display = 'block';
        document.getElementById('sbBackIcon').style.display = 'none';
      }
      document.getElementById('sbOwnerSelect').value = sb.ownerId || 'user';
    }
  } else {
    titleEl.textContent = '新建手账';
    document.getElementById('sbOwnerSelect').value = 'user';
  }
  navigateTo('pageScrapbookEdit');
}

function handleScrapbookImg(e, type) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX = 600;
      var w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
      else { if (h > MAX) { w *= MAX / h; h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      tempSbImages[type] = dataUrl;
      var preview = document.getElementById('sb' + type.charAt(0).toUpperCase() + type.slice(1) + 'Preview');
      var icon = document.getElementById('sb' + type.charAt(0).toUpperCase() + type.slice(1) + 'Icon');
      if (preview) { preview.src = dataUrl; preview.style.display = 'block'; }
      if (icon) { icon.style.display = 'none'; }
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function saveScrapbook() {
  var ownerVal = document.getElementById('sbOwnerSelect').value;
  var ownerName = '未知';
  if (ownerVal === 'user') {
    ownerName = state.profile.name || '我';
  } else {
    var _ownerDream = state.dreams.find(function(d) { return d.id === ownerVal; });
    if (_ownerDream) ownerName = _ownerDream.name;
  }
  var sbName = document.getElementById('sbNameInput').value.trim();

  if (currentSbId) {
    var sb = state.scrapbooks.find(x => x.id === currentSbId);
    if (sb) {
      sb.frontImg = tempSbImages.front;
      sb.sideImg = tempSbImages.side;
      sb.backImg = tempSbImages.back;
      sb.ownerId = ownerVal;
      sb.ownerName = ownerName;
      sb.name = sbName;
    }
  } else {
    var newSb = {
      id: 'sb_' + Date.now(), ownerId: ownerVal, ownerName: ownerName, name: sbName,
      frontImg: tempSbImages.front, sideImg: tempSbImages.side, backImg: tempSbImages.back,
      pages: [{ left: '', right: '' }],
      createdAt: Date.now()
    };
    state.scrapbooks.push(newSb);
  }
  saveState();
  showToast('手账已保存');
  navigateTo('pageScrapbook');
  renderScrapbookList();
}

// ===== 2. 阅读/翻页页 =====
function openScrapbookView(id) {
  currentSbObj = state.scrapbooks.find(x => x.id === id);
  if (!currentSbObj) return;

  if (!currentSbObj.pages || currentSbObj.pages.length === 0) {
    currentSbObj.pages = [{ left: '', right: '' }];
    saveState();
  }

  currentSbPageIdx = 0;
  document.getElementById('sbViewTitle').textContent = currentSbObj.name || '手账';
  navigateTo('pageScrapbookView');
  renderScrapbookView();
}

function renderScrapbookView() {
  if (!currentSbObj || !currentSbObj.pages) return;
  
  // 切换页面时隐藏动画层
  var flipLayer = document.getElementById('sbFlipLayer');
  if(flipLayer) flipLayer.style.display = 'none';

  var pageData = currentSbObj.pages[currentSbPageIdx] || { left: '', right: '' };
  var EMPTY = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27%3E%3Crect width=%27100%27 height=%27100%27 fill=%27%23fff%27/%3E%3Ctext x=%2750%27 y=%2755%27 text-anchor=%27middle%27 fill=%27%23ddd%27 font-size=%2711%27%3E点击创作%3C/text%3E%3C/svg%3E';

  document.getElementById('sbViewLeftImg').src  = pageData.left  || EMPTY;
  document.getElementById('sbViewRightImg').src = pageData.right || EMPTY;
  document.getElementById('sbPageNum').textContent = currentSbPageIdx + 1;
}

// 点击放大
function showSbPageLarge(side) {
  var pageData = currentSbObj.pages[currentSbPageIdx] || { left: '', right: '' };
  var imgSrc = pageData[side];
  if (!imgSrc) return; // 如果是空的就不放大

  document.getElementById('sbLargeImg').src = imgSrc;
  document.getElementById('sbLargeView').style.display = 'flex';
}

// 下一页（带 3D 翻页动画）
function nextSbPage() {
  if (!currentSbObj.pages[currentSbPageIdx + 1]) {
    currentSbObj.pages.push({ left: '', right: '' });
    saveState();
  }
  
  var flipLayer = document.getElementById('sbFlipLayer');
  var flipImg = document.getElementById('sbFlipImg');
  
  // 拿当前右页的内容作为翻页层
  flipImg.src = document.getElementById('sbViewRightImg').src;
  flipLayer.className = 'sb-flip-layer right';
  flipLayer.style.display = 'block';
  
  // 强制重绘
  void flipLayer.offsetWidth; 
  
  // 开始翻转
  flipLayer.style.transition = 'transform 0.6s ease-in-out';
  flipLayer.style.transform = 'rotateY(-180deg)';
  
  setTimeout(function() {
    currentSbPageIdx++;
    renderScrapbookView();
    flipLayer.style.transition = 'none';
    flipLayer.style.transform = 'rotateY(0deg)';
  }, 600);
}

// 上一页（带 3D 翻页动画）
function prevSbPage() {
  if (currentSbPageIdx <= 0) {
    showToast('已经是第一页了');
    return;
  }
  
  var flipLayer = document.getElementById('sbFlipLayer');
  var flipImg = document.getElementById('sbFlipImg');
  
  // 拿当前左页的内容作为翻页层
  flipImg.src = document.getElementById('sbViewLeftImg').src;
  flipLayer.className = 'sb-flip-layer left';
  flipLayer.style.display = 'block';
  
  void flipLayer.offsetWidth; 
  
  // 开始翻转
  flipLayer.style.transition = 'transform 0.6s ease-in-out';
  flipLayer.style.transform = 'rotateY(180deg)';
  
  setTimeout(function() {
    currentSbPageIdx--;
    renderScrapbookView();
    flipLayer.style.transition = 'none';
    flipLayer.style.transform = 'rotateY(0deg)';
  }, 600);
}

// ===== 3. 创作画板页 =====
function openDrawPage(side) {
  if (!currentSbObj) return;
  currentSbSide = side;

  if (!currentSbObj.pages) currentSbObj.pages = [{ left: '', right: '' }];
  if (!currentSbObj.pages[currentSbPageIdx]) {
    currentSbObj.pages[currentSbPageIdx] = { left: '', right: '' };
  }

  var pageData = currentSbObj.pages[currentSbPageIdx];
  // 兼容旧版本，如果没有 Layers，就退回读取单张背景图
  var layersData = pageData[side + 'Layers'] || null;
  var bgImg = pageData[side + 'Bg'] || pageData[side] || '';
  var objs = pageData[side + 'Objs'] || [];

  navigateTo('pageScrapbookDraw');
  setTimeout(function () {
    initSbCanvas(bgImg, objs, layersData);
  }, 100);
}

function initSbCanvas(bgImgBase64, objs, layersData) {
  var container = document.getElementById('sbCanvasContainer');
  if (!container) return;
  
  var w = container.clientWidth - 20;
  var h = container.clientHeight - 20;
  
  if (w <= 0 || h <= 0) {
    setTimeout(function() { initSbCanvas(bgImgBase64, objs, layersData); }, 100);
    return;
  }

  sbCanvas = document.getElementById('sbCanvas');
  sbCanvas.style.pointerEvents = 'none'; 
  sbCtx = sbCanvas.getContext('2d');
  
  sbCanvas.width = w; sbCanvas.height = h;

  var wrapper = document.getElementById('sbCanvasWrapper');
  if(wrapper) {
    wrapper.style.width = w + 'px';
    wrapper.style.height = h + 'px';
    window._sbCanvasScale = 1;
    wrapper.style.transform = 'scale(1)';
  }

  document.getElementById('sbLayersStack').innerHTML = '';
  document.getElementById('sbLayersStack').style.pointerEvents = 'none';
  sbLayers = [];
  activeLayerId = null;

  // 如果有保存过的图层数据
  if (layersData && Array.isArray(layersData) && layersData.length > 0) {
    layersData.forEach(function(ld, index) {
      var newL = createSbLayer(ld.name);
      newL.visible = ld.visible;
      newL.opacity = ld.opacity;
      newL.blendMode = ld.blendMode;
      
      newL.container.style.display = ld.visible ? 'block' : 'none';
      newL.container.style.opacity = ld.opacity;
      newL.container.style.mixBlendMode = ld.blendMode === 'normal' ? 'normal' : ld.blendMode;

      // 👇【核心修复】：必须在恢复贴纸前，先把当前图层设为激活状态，否则贴纸找不到家！
      activeLayerId = newL.id;

      // 恢复画笔
      if (ld.canvasData && ld.canvasData.length > 50) {
        var img = new Image();
        img.onload = function() {
          newL.bgCtx.drawImage(img, 0, 0, w, h);
          newL.ctx.drawImage(img, 0, 0);
          newL.undoStack = [newL.bgCanvas.toDataURL()];
        };
        img.src = ld.canvasData;
      } else {
        newL.undoStack = [newL.bgCanvas.toDataURL()];
      }

      // 恢复贴纸（此时 activeLayerId 是对的）
      if (ld.objs && ld.objs.length > 0) {
        ld.objs.forEach(function(o) {
          createSbObject(o.type, o.content, o.w, o.h, o.text, o.x, o.y, o.rotate);
        });
      }
    });
    
    // 循环结束后，默认选中最后一个图层
    if (sbLayers.length > 0) {
      activeLayerId = sbLayers[sbLayers.length - 1].id;
    }
    
  } else {
    // 兼容老版本单图层
    createSbLayer('背景');
    activeLayerId = sbLayers[0].id;

    if (bgImgBase64) {
      var img = new Image();
      img.onload = function() {
        var layer = sbLayers[0];
        layer.bgCtx.drawImage(img, 0, 0, w, h);
        layer.ctx.drawImage(img, 0, 0);
        layer.undoStack = [layer.bgCanvas.toDataURL()];
      };
      img.src = bgImgBase64;
    } else {
      sbLayers[0].undoStack = [sbLayers[0].bgCanvas.toDataURL()];
    }

    if (objs && objs.length > 0) {
      objs.forEach(function(o) {
        createSbObject(o.type, o.content, o.w, o.h, o.text, o.x, o.y, o.rotate);
      });
    }
  }

  bindSbCanvasEvents();
  switchSbTool('move');
  initSbPinchZoom();
  renderLayersUI();
}

function bindSbCanvasEvents() {
  var wrapper = document.getElementById('sbCanvasWrapper');
  if (wrapper._bound) return;
  wrapper._bound = true;
  wrapper.style.touchAction = 'none';

  var getPos = function(e) {
    var rect = wrapper.getBoundingClientRect();
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    var scaleX = sbCanvas.width / rect.width;
    var scaleY = sbCanvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  wrapper.addEventListener('mousedown', startDraw);
  wrapper.addEventListener('mousemove', draw);
  wrapper.addEventListener('mouseup', endDraw);
  wrapper.addEventListener('mouseout', endDraw);
  wrapper.addEventListener('touchstart', startDraw, { passive: false });
  wrapper.addEventListener('touchmove', draw, { passive: false });
  wrapper.addEventListener('touchend', endDraw);

  function startDraw(e) {
    if (currentSbTool === 'move') return;
    if (e.target.closest('.ctrl-btn')) return;
    if (e.touches && e.touches.length > 1) return;

    var layer = getActiveLayer();
    if (!layer) return;

    e.preventDefault();
    isDrawing = true;
    var pos = getPos(e);
    sbCurrentPath = [{ x: pos.x, y: pos.y, time: Date.now(), width: getBaseSize() }];
  }

    function draw(e) {
    if (!isDrawing) return;
    if (e.touches && e.touches.length > 1) return;
    
    var layer = getActiveLayer();
    if (!layer) return;

    e.preventDefault();
    var pos = getPos(e);
    var now = Date.now();
    var lastPoint = sbCurrentPath[sbCurrentPath.length - 1];
    var baseSize = getBaseSize();

    if (currentSbTool === 'eraser') {
      // 1. 增量擦除底层画迹
      layer.ctx.globalCompositeOperation = 'destination-out';
      layer.ctx.beginPath();
      layer.ctx.lineWidth = baseSize * 1.5;
      layer.ctx.lineCap = 'round';
      layer.ctx.lineJoin = 'round';
      layer.ctx.moveTo(lastPoint.x, lastPoint.y);
      layer.ctx.lineTo(pos.x, pos.y);
      layer.ctx.stroke();
      layer.ctx.globalCompositeOperation = 'source-over';

      // 2. 一点点擦除贴纸（像素级）
      var rect = wrapper.getBoundingClientRect();
      var cssX = pos.x * (rect.width / sbCanvas.width);
      var cssY = pos.y * (rect.height / sbCanvas.height);
      
      var objs = layer.objectLayer.querySelectorAll('.sb-obj-wrapper');
      objs.forEach(function(obj) {
        var objL = parseFloat(obj.style.left);
        var objT = parseFloat(obj.style.top);
        var objW = obj.offsetWidth;
        var objH = obj.offsetHeight;
        
        if (cssX >= objL - objW/2 && cssX <= objL + objW/2 && cssY >= objT - objH/2 && cssY <= objT + objH/2) {
          var cvs = obj.querySelector('canvas');
          if (cvs) {
            var ictx = cvs.getContext('2d');
            var localX = (cssX - (objL - objW/2)) / objW * cvs.width;
            var localY = (cssY - (objT - objH/2)) / objH * cvs.height;
            
            var rot = parseFloat(obj.dataset.rotate) || 0;
            ictx.save();
            ictx.translate(localX, localY);
            ictx.rotate(-rot * Math.PI / 180);
            ictx.globalCompositeOperation = 'destination-out';
            ictx.beginPath();
            ictx.arc(0, 0, baseSize, 0, Math.PI * 2);
            ictx.fill();
            ictx.restore();
          }
        }
      });

    } else {
      // 画笔
      var dist = Math.sqrt(Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2));
      var timeDiff = Math.max(1, now - lastPoint.time);
      var speed = dist / timeDiff;
      var dynamicSize = Math.max(baseSize * 0.2, baseSize * (1.2 - speed * 0.5));
      var newPoint = { x: pos.x, y: pos.y, time: now, width: dynamicSize, dist: dist };
      sbCurrentPath.push(newPoint);
      
      var brushType = document.getElementById('sbBrushType').value;
      var isScatterBrush = ['pencil', 'crayon', 'chalk', 'watercolor', 'spray', 'roller'].includes(brushType);

      if (isScatterBrush) {
        drawScatterPoint(layer.ctx, newPoint, lastPoint, brushType, baseSize);
      } else {
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        layer.ctx.drawImage(layer.bgCanvas, 0, 0); 
        drawSmoothPath(layer.ctx, sbCurrentPath, brushType, baseSize);
      }
    }
  }

  function endDraw(e) {
    if (!isDrawing) return;
    isDrawing = false;
    var layer = getActiveLayer();
    if (!layer) return;

    // 【核心修复2】：松手后的同步
    if (currentSbTool === 'eraser') {
      // 橡皮松手：把带有透明洞的画布，完整同步到底图
      layer.bgCtx.clearRect(0, 0, layer.bgCanvas.width, layer.bgCanvas.height);
      layer.bgCtx.drawImage(layer.canvas, 0, 0);
    } else {
      // 画笔松手：保存笔迹
      var brushType = document.getElementById('sbBrushType').value;
      var isScatterBrush = ['pencil', 'crayon', 'chalk', 'watercolor', 'spray', 'roller'].includes(brushType);
      if (isScatterBrush) {
        layer.bgCtx.drawImage(layer.canvas, 0, 0);
      } else {
        drawSmoothPath(layer.bgCtx, sbCurrentPath, brushType, getBaseSize());
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        layer.ctx.drawImage(layer.bgCanvas, 0, 0);
      }
    }
    
    sbCurrentPath = [];
    saveSbSnapshot(); // 记录撤销快照
    renderLayersUI(); 
  }
}

// 获取基础大小和透明度
function getBaseSize() {
  var base = parseInt(document.getElementById('sbSizeSlider').value) || 5;
  return currentSbTool === 'eraser' ? base * 2 : base;
}
function getOpacity() { return parseFloat(document.getElementById('sbOpacitySlider').value) || 1; }
function getColor() {
  if (currentSbTool === 'eraser') return '#ffffff';
  return document.getElementById('sbColorPicker').value;
}

function drawSmoothPath(ctx, path, type, baseSize) {
  if (path.length === 0) return;
  var opacity = getOpacity();
  var color = getColor();
  
  ctx.globalAlpha = opacity;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  if (type === 'ballpoint') {
    ctx.lineWidth = Math.max(1, baseSize * 0.3);
    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for (var i=1; i<path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    if (path.length === 1) ctx.lineTo(path[0].x+0.1, path[0].y);
    ctx.stroke();
  } 
  else if (type === 'pen') {
    for (var i=1; i<path.length; i++) {
      ctx.lineWidth = path[i].width;
      ctx.beginPath(); ctx.moveTo(path[i-1].x, path[i-1].y); ctx.lineTo(path[i].x, path[i].y); ctx.stroke();
    }
  }
  else if (type === 'marker') {
    ctx.lineCap = 'square';
    ctx.lineWidth = baseSize * 2;
    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for (var i=1; i<path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    
    ctx.globalAlpha = opacity * 0.3;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = baseSize * 1.5;
    ctx.stroke();
  }
  else if (type === 'hollow') {
    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for (var i=1; i<path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    if (path.length === 1) ctx.lineTo(path[0].x+0.1, path[0].y);
    ctx.lineWidth = baseSize * 2.5;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.lineWidth = baseSize * 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawScatterPoint(ctx, curr, prev, type, baseSize) {
  var opacity = getOpacity();
  var color = getColor();
  ctx.fillStyle = color;
  
  var dist = curr.dist || 2;
  var steps = Math.ceil(dist / 1.5); 

  for (var i = 0; i <= steps; i++) {
    var t = i / Math.max(1, steps);
    var cx = prev.x + (curr.x - prev.x) * t;
    var cy = prev.y + (curr.y - prev.y) * t;
    
    if (type === 'pencil') {
      for(var j=0; j<5; j++){
        var rx = cx + (Math.random()-0.5)*baseSize*1.2;
        var ry = cy + (Math.random()-0.5)*baseSize*1.2;
        ctx.globalAlpha = opacity * (0.1 + Math.random()*0.3);
        ctx.fillRect(rx, ry, Math.max(1, baseSize*0.15), Math.max(1, baseSize*0.15));
      }
    } 
    else if (type === 'crayon') {
      for(var j=0; j<8; j++){ 
        var rx = cx + (Math.random()-0.5)*baseSize*0.6; 
        var ry = cy + (Math.random()-0.5)*baseSize*0.6;
        ctx.globalAlpha = opacity * (0.3 + Math.random()*0.4);
        ctx.beginPath();
        ctx.arc(rx, ry, Math.random()*baseSize*0.2 + 0.5, 0, Math.PI*2);
        ctx.fill();
      }
    }
    else if (type === 'chalk') {
      for(var j=0; j<6; j++){
        var rx = cx + (Math.random()-0.5)*baseSize*1.8;
        var ry = cy + (Math.random()-0.5)*baseSize*1.8;
        ctx.globalAlpha = opacity * 0.2;
        ctx.beginPath();
        ctx.arc(rx, ry, 0.5 + Math.random()*1.5, 0, Math.PI*2);
        ctx.fill();
      }
    }
    else if (type === 'watercolor') {
      ctx.globalAlpha = opacity * 0.05; 
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = baseSize * 1.5 + Math.random()*baseSize;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
      if (Math.random() < 0.3) {
        ctx.beginPath();
        ctx.arc(cx + (Math.random()-0.5)*baseSize, cy + (Math.random()-0.5)*baseSize, baseSize*0.5, 0, Math.PI*2);
        ctx.fill();
      }
    }
    else if (type === 'spray') {
      for (var j=0; j<12; j++) {
        var angle = Math.random() * Math.PI * 2;
        var radius = Math.random() * baseSize * 2;
        var rx = cx + Math.cos(angle) * radius;
        var ry = cy + Math.sin(angle) * radius;
        ctx.globalAlpha = opacity * 0.15;
        ctx.beginPath();
        ctx.arc(rx, ry, 0.5 + Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    else if (type === 'roller') {
      ctx.globalAlpha = opacity * 0.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = baseSize * 1.2;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();

      for (var j=0; j<6; j++) {
        var rx = cx + (Math.random()-0.5)*baseSize*1.5;
        var ry = cy + (Math.random()-0.5)*baseSize*1.5;
        ctx.globalAlpha = opacity * (0.4 + Math.random()*0.6);
        ctx.beginPath();
        ctx.arc(rx, ry, Math.random()*baseSize*0.3 + 0.5, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function switchSbTool(tool) {
  currentSbTool = tool;
  document.querySelectorAll('#sbToolbar .sb-tool-btn[data-tool]').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
  
  var colorPicker = document.getElementById('sbColorPicker');
  var brushType = document.getElementById('sbBrushType');
  var sizeSlider = document.getElementById('sbSizeSlider');
  var opacitySlider = document.getElementById('sbOpacitySlider');

  if (tool === 'move') {
    if (colorPicker) colorPicker.style.display = 'none';
    if (brushType) brushType.style.display = 'none';
    if (sizeSlider) sizeSlider.style.display = 'none';
    if (opacitySlider) opacitySlider.style.display = 'none';
  } else if (tool === 'eraser') {
    if (colorPicker) colorPicker.style.display = 'none';
    if (brushType) brushType.style.display = 'none';
    if (sizeSlider) sizeSlider.style.display = 'block';
    if (opacitySlider) opacitySlider.style.display = 'block';
  } else {
    if (colorPicker) colorPicker.style.display = 'block';
    if (brushType) brushType.style.display = 'block';
    if (sizeSlider) sizeSlider.style.display = 'block';
    if (opacitySlider) opacitySlider.style.display = 'block';
  }

  // 【核心修复】：控制贴纸是否拦截鼠标事件
  document.querySelectorAll('.sb-obj-wrapper').forEach(function(obj) {
    if (tool === 'move') {
      obj.style.pointerEvents = 'auto';
    } else {
      obj.style.pointerEvents = 'none'; // 让鼠标穿透贴纸，直接点到画布上！
    }
  });

  // 在 switchSbTool 函数末尾加上这段：
  document.querySelectorAll('.sb-obj-wrapper').forEach(function(obj) {
    if (tool === 'move') {
      obj.style.pointerEvents = 'auto';
    } else {
      obj.style.pointerEvents = 'none'; 
    }
  });

}

// ===== 4. 图片与文字对象编辑 =====
function textToImage(text, fontSize = 32, color = '#1d1d1f') {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var fontStr = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  
  // 处理多行文字（支持回车换行）
  var lines = text.split('\n');
  var maxWidth = 0;
  ctx.font = fontStr;
  lines.forEach(function(line) {
    var w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  });
  
  var w = Math.ceil(maxWidth) + 20;
  var lineHeight = fontSize * 1.4;
  var h = lines.length * lineHeight + 10;
  
  canvas.width = w;
  canvas.height = h;
  
  ctx.font = fontStr;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 逐行绘制
  lines.forEach(function(line, index) {
    ctx.fillText(line, w / 2, 5 + lineHeight * index + lineHeight / 2);
  });
  
  return { dataUrl: canvas.toDataURL(), width: w, height: h };
}

function handleSbImageUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var maxW = 150, maxH = 150, w = img.width, h = img.height;
      if (w > maxW || h > maxH) {
        var ratio = Math.min(maxW / w, maxH / h);
        w *= ratio; h *= ratio;
      }
      createSbObject('image', ev.target.result, w, h);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

// 点击 T文字 按钮时触发（改成弹窗）
function addTextToCanvas() {
  document.getElementById('sbTextInput').value = '';
  document.getElementById('sbTextModal').style.display = 'flex';
  setTimeout(function() {
    document.getElementById('sbTextInput').focus();
  }, 100);
}

// 弹窗点击确定时触发
function confirmAddTextToCanvas() {
  var text = document.getElementById('sbTextInput').value.trim();
  if (!text) { showToast('请输入文字'); return; }
  var color = document.getElementById('sbTextColor').value;
  
  // 生成图片
  var res = textToImage(text, 32, color);
  // 添加到画布
  createSbObject('image', res.dataUrl, res.width, res.height, text);
  
  document.getElementById('sbTextModal').style.display = 'none';
}

function createSbObject(type, content, initW, initH, originalText, posX, posY, rotate) {
  var activeL = getActiveLayer();
  if (!activeL) return;
  var layer = activeL.objectLayer;

  var obj = document.createElement('div');
  obj.className = 'sb-obj-wrapper';
  
  var deg = rotate ? parseFloat(rotate) : 0;
  obj.dataset.rotate = deg;
  obj.dataset.text = originalText || '';
  
  var leftStyle = posX ? posX : '50%';
  var topStyle = posY ? posY : '50%';
  
  obj.style.cssText = `position:absolute; left:${leftStyle}; top:${topStyle}; width:${initW}px; height:${initH}px; transform:translate(-50%,-50%) rotate(${deg}deg); border:2px dashed transparent; box-sizing:border-box; pointer-events:auto; touch-action:none;`;

  // 【核心修复1】：根据当前工具决定是否拦截鼠标
  if (typeof currentSbTool !== 'undefined' && currentSbTool !== 'move') {
    obj.style.pointerEvents = 'none';
  }

  var inner = document.createElement('div');
  inner.className = 'sb-obj-content';
  inner.style.cssText = 'width:100%; height:100%; pointer-events:none; display:flex; align-items:center; justify-content:center; overflow:hidden;';

  // 【核心修复2】：用 Canvas 替代 img，支持像素级擦除
  var img = new Image();
  img.onload = function() {
    var imgCanvas = document.createElement('canvas');
    imgCanvas.width = img.width;
    imgCanvas.height = img.height;
    var ictx = imgCanvas.getContext('2d');
    ictx.drawImage(img, 0, 0);
    imgCanvas.style.cssText = 'width:100%; height:100%; object-fit:fill; display:block;';
    inner.appendChild(imgCanvas);
  };
  img.src = content;
  obj.appendChild(inner);

  // ---- 以下控制按钮代码保持不变 ----
  var commonStyle = 'position:absolute; color:#fff; border-radius:50%; text-align:center; cursor:pointer; pointer-events:auto; z-index:99999; box-shadow:0 2px 8px rgba(0,0,0,0.6); display:none; mix-blend-mode:normal; transform:translateZ(0); border:2px solid #fff;';
  
  var delBtn = document.createElement('div');
  delBtn.innerHTML = '×';
  delBtn.className = 'ctrl-btn';
  delBtn.style.cssText = commonStyle + ' top:-12px; right:-12px; width:24px; height:24px; background:#ff3b30; line-height:20px; font-size:16px; font-weight:bold;';
  delBtn.onclick = function(e) { e.stopPropagation(); obj.remove(); };
  obj.appendChild(delBtn); var ctrls = [delBtn];

  var checkBtn = document.createElement('div');
  checkBtn.innerHTML = '✓';
  checkBtn.className = 'ctrl-btn';
  checkBtn.style.cssText = commonStyle + ' top:-12px; left:-12px; width:24px; height:24px; background:#007aff; line-height:20px; font-size:14px; font-weight:bold;';
  checkBtn.onclick = function(e) { 
    e.stopPropagation(); obj.style.borderColor = 'transparent'; 
    ctrls.forEach(function(b) { b.style.display = 'none'; });
  };
  obj.appendChild(checkBtn); ctrls.push(checkBtn);

  var scaleBtn = document.createElement('div');
  scaleBtn.className = 'ctrl-btn';
  scaleBtn.style.cssText = commonStyle + ' bottom:-12px; right:-12px; width:24px; height:24px; background:#007aff; cursor:se-resize;';
  obj.appendChild(scaleBtn); ctrls.push(scaleBtn);

  var rotBtn = document.createElement('div');
  rotBtn.className = 'ctrl-btn';
  rotBtn.style.cssText = commonStyle + ' top:-36px; left:50%; margin-left:-12px; width:24px; height:24px; background:#34c759; cursor:grab;';
  obj.appendChild(rotBtn); ctrls.push(rotBtn);

  layer.appendChild(obj);
  
  if (posX === undefined || posY === undefined) {
    obj.style.left = obj.offsetLeft + 'px';
    obj.style.top = obj.offsetTop + 'px';
  }

  bindSbObjEvents(obj, scaleBtn, rotBtn, ctrls, originalText);
  
  if (!posX) {
    setTimeout(function(){ obj.dispatchEvent(new Event('mousedown')); }, 50);
  }
}

function bindSbObjEvents(obj, scaleBtn, rotBtn, ctrls, originalText) {
  if (originalText) {
    obj.addEventListener('dblclick', function() {
      var newText = prompt('修改文字：', originalText);
      if (newText && newText.trim()) {
        originalText = newText.trim();
        obj.dataset.text = originalText;
        var res = textToImage(originalText);
        obj.querySelector('img').src = res.dataUrl;
      }
    });
  }

  // 1. 鼠标按下拖拽
  obj.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return; // 只处理左键
    if (e.target.classList.contains('ctrl-btn')) return;
    e.preventDefault(); // 阻止浏览器的图片拖拽默认行为
    e.stopPropagation();
    
    window.sbDragState = {
      isDragging: true, isScaling: false, isRotating: false,
      target: obj,
      startX: e.clientX, startY: e.clientY,
      startLeft: obj.offsetLeft, startTop: obj.offsetTop
    };
    
    ctrls.forEach(b => b.style.display = 'flex');
    obj.style.borderColor = 'var(--blue)';
    obj.style.zIndex = 100;
    document.querySelectorAll('.sb-obj-wrapper').forEach(o => {
      if (o !== obj) {
        o.style.borderColor = 'transparent';
        o.style.zIndex = 1;
        o.querySelectorAll('.ctrl-btn').forEach(b => b.style.display = 'none');
      }
    });
  });

  // 2. 手机触摸按下拖拽
  obj.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) return;
    if (e.target.classList.contains('ctrl-btn')) return;
    e.preventDefault();
     e.stopPropagation();
    
    window.sbDragState = {
      isDragging: true, isScaling: false, isRotating: false,
      target: obj,
      startX: e.touches[0].clientX, startY: e.touches[0].clientY,
      startLeft: obj.offsetLeft, startTop: obj.offsetTop
    };
    
    ctrls.forEach(b => b.style.display = 'flex');
    obj.style.borderColor = 'var(--blue)';
    obj.style.zIndex = 100;
    document.querySelectorAll('.sb-obj-wrapper').forEach(o => {
      if (o !== obj) {
        o.style.borderColor = 'transparent';
        o.style.zIndex = 1;
        o.querySelectorAll('.ctrl-btn').forEach(b => b.style.display = 'none');
      }
    });
  }, {passive: false});

  // 3. 缩放按钮
  function startScale(cx, cy) {
    window.sbDragState = {
      isDragging: false, isScaling: true, isRotating: false,
      target: obj,
      startX: cx, startY: cy,
      startW: obj.offsetWidth, startH: obj.offsetHeight
    };
  }
  scaleBtn.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation(); startScale(e.clientX, e.clientY); });
  scaleBtn.addEventListener('touchstart', function(e) { e.preventDefault(); e.stopPropagation(); startScale(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});

  // 4. 旋转按钮
  function startRotate(cx, cy) {
    var rect = obj.getBoundingClientRect();
    window.sbDragState = {
      isDragging: false, isScaling: false, isRotating: true,
      target: obj,
      centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2,
      startAngle: Math.atan2(cy - (rect.top + rect.height / 2), cx - (rect.left + rect.width / 2)) * 180 / Math.PI - (parseFloat(obj.dataset.rotate) || 0)
    };
  }
  rotBtn.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation(); startRotate(e.clientX, e.clientY); });
  rotBtn.addEventListener('touchstart', function(e) { e.preventDefault(); e.stopPropagation(); startRotate(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
}

// ===== 全局拖拽/缩放/旋转处理（只注册一次，解决电脑卡死） =====
window.sbDragState = { isDragging: false, isScaling: false, isRotating: false, target: null };

function handleGlobalMove(cx, cy) {
  var s = window.sbDragState;
  if (!s || !s.target) return;
  var scale = window._sbCanvasScale || 1;
  var obj = s.target;

  if (s.isDragging) {
    var dx = (cx - s.startX) / scale;
    var dy = (cy - s.startY) / scale;
    obj.style.left = (s.startLeft + dx) + 'px';
    obj.style.top = (s.startTop + dy) + 'px';
  } else if (s.isScaling) {
    var dx2 = (cx - s.startX) / scale;
    var dy2 = (cy - s.startY) / scale;
    obj.style.width = Math.max(30, s.startW + dx2) + 'px';
    obj.style.height = Math.max(30, s.startH + dy2) + 'px';
  } else if (s.isRotating) {
    var curAngle = Math.atan2(cy - s.centerY, cx - s.centerX) * 180 / Math.PI;
    var deg = curAngle - s.startAngle;
    obj.dataset.rotate = deg;
    obj.style.transform = `translate(-50%,-50%) rotate(${deg}deg)`;
  }
}

function endGlobalMove() {
  if (window.sbDragState) {
    window.sbDragState.isDragging = false;
    window.sbDragState.isScaling = false;
    window.sbDragState.isRotating = false;
    window.sbDragState.target = null;
  }
}

// 移除旧的全局监听器，防止重复绑定
document.addEventListener('mousemove', function(e) {
  if (window.sbDragState && (window.sbDragState.isDragging || window.sbDragState.isScaling || window.sbDragState.isRotating)) {
    e.preventDefault();
    handleGlobalMove(e.clientX, e.clientY);
  }
});
document.addEventListener('mouseup', endGlobalMove);

document.addEventListener('touchmove', function(e) {
  if (window.sbDragState && (window.sbDragState.isDragging || window.sbDragState.isScaling || window.sbDragState.isRotating)) {
    if (e.cancelable) e.preventDefault();
    handleGlobalMove(e.touches[0].clientX, e.touches[0].clientY);
  }
}, {passive: false});
document.addEventListener('touchend', endGlobalMove);

// ===== 5. 保存/撤销/清除 =====
function saveSbSnapshot() {
  var layer = getActiveLayer();
  if (!layer) return;
  try {
    var dataUrl = layer.bgCanvas.toDataURL('image/png');
    layer.undoStack.push(dataUrl);
    if (layer.undoStack.length > 20) layer.undoStack.shift();
    layer.redoStack = [];
  } catch (e) { console.warn('快照失败', e); }
}

function sbUndo() {
  var layer = getActiveLayer();
  if (!layer || layer.undoStack.length <= 1) { showToast('当前图层没有可撤销的操作'); return; }
  
  var current = layer.undoStack.pop();
  layer.redoStack.push(current);
  var prev = layer.undoStack[layer.undoStack.length - 1];
  
  var img = new Image();
  img.onload = function () {
    layer.bgCtx.clearRect(0, 0, layer.bgCanvas.width, layer.bgCanvas.height);
    layer.bgCtx.drawImage(img, 0, 0);
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(layer.bgCanvas, 0, 0);
  };
  img.src = prev;
  renderLayersUI();
}

function sbRedo() {
  var layer = getActiveLayer();
  if (!layer || layer.redoStack.length === 0) { showToast('当前图层没有可前进的操作'); return; }
  
  var next = layer.redoStack.pop();
  layer.undoStack.push(next);
  
  var img = new Image();
  img.onload = function () {
    layer.bgCtx.clearRect(0, 0, layer.bgCanvas.width, layer.bgCanvas.height);
    layer.bgCtx.drawImage(img, 0, 0);
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(layer.bgCanvas, 0, 0);
  };
  img.src = next;
  renderLayersUI();
}

function saveScrapbookPage() {
  if (!currentSbObj) { navigateTo('pageScrapbook'); return; }
  if (!currentSbObj.pages) currentSbObj.pages = [];
  if (!currentSbObj.pages[currentSbPageIdx]) currentSbObj.pages[currentSbPageIdx] = { left: '', right: '' };

  var mergeCanvas = document.createElement('canvas');
  mergeCanvas.width = sbCanvas.width;
  mergeCanvas.height = sbCanvas.height;
  var mergeCtx = mergeCanvas.getContext('2d');
  mergeCtx.fillStyle = '#ffffff';
  mergeCtx.fillRect(0, 0, mergeCanvas.width, mergeCanvas.height);

  var canvasRect = sbCanvas.getBoundingClientRect();
  var scaleX = sbCanvas.width / canvasRect.width;
  var scaleY = sbCanvas.height / canvasRect.height;

  var layersData = []; 

  sbLayers.forEach(function(layer) {
    // 1. 智能检测：如果图层没有画笔画，背景图存空
    var isEmpty = true;
    try {
      var imgData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height).data;
      for (var i = 3; i < imgData.length; i += 4) {
        if (imgData[i] !== 0) { isEmpty = false; break; }
      }
    } catch(e) { isEmpty = false; }
    
    var bgData = isEmpty ? null : layer.bgCanvas.toDataURL('image/png');
    var objsData = [];

    Array.from(layer.objectLayer.children).forEach(function(obj) {
      var objCanvas = obj.querySelector('canvas');
      var objImg = obj.querySelector('img');
      var content = objCanvas ? objCanvas.toDataURL('image/png') : (objImg ? objImg.src : '');
      
      objsData.push({
        type: 'image',
        content: content,
        w: obj.offsetWidth,
        h: obj.offsetHeight,
        text: obj.dataset.text || '',
        x: obj.style.left,
        y: obj.style.top,
        rotate: obj.dataset.rotate || 0
      });
    });

    layersData.push({
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      canvasData: bgData,
      objs: objsData
    });

    // 2. 渲染合成图
    if (!layer.visible) return;
    var tempC = document.createElement('canvas');
    tempC.width = mergeCanvas.width;
    tempC.height = mergeCanvas.height;
    var tCtx = tempC.getContext('2d');
    
    tCtx.drawImage(layer.bgCanvas, 0, 0);
    Array.from(layer.objectLayer.children).forEach(function(obj) {
      var img = obj.querySelector('canvas') || obj.querySelector('img');
      if (!img) return;
      var rect = obj.getBoundingClientRect();
      var x = (rect.left - canvasRect.left + rect.width / 2) * scaleX;
      var y = (rect.top - canvasRect.top + rect.height / 2) * scaleY;
      var w = rect.width * scaleX;
      var h = rect.height * scaleY;
      var angle = parseFloat(obj.dataset.rotate || 0) * Math.PI / 180;
      tCtx.save();
      tCtx.translate(x, y);
      tCtx.rotate(angle);
      tCtx.drawImage(img, -w/2, -h/2, w, h);
      tCtx.restore();
    });
    
    mergeCtx.globalAlpha = layer.opacity;
    mergeCtx.globalCompositeOperation = layer.blendMode === 'normal' ? 'source-over' : layer.blendMode;
    mergeCtx.drawImage(tempC, 0, 0);
  });

  currentSbObj.pages[currentSbPageIdx][currentSbSide] = mergeCanvas.toDataURL('image/jpeg', 0.85);
  currentSbObj.pages[currentSbPageIdx][currentSbSide + 'Bg'] = currentSbObj.pages[currentSbPageIdx][currentSbSide];
  currentSbObj.pages[currentSbPageIdx][currentSbSide + 'Layers'] = layersData;
  currentSbObj.pages[currentSbPageIdx][currentSbSide + 'Objs'] = [];

  saveState();
  
  document.getElementById('sbLayersPanel').style.display = 'none';
  var settingsPanel = document.getElementById('sbLayerSettings');
  if (settingsPanel) settingsPanel.style.display = 'none';

  showToast('已保存');
  renderScrapbookView();
  navigateTo('pageScrapbookView');
}

function clearSbCanvas() {
  if (!confirm('确定要清空当前图层吗？此操作不可撤销。')) return;
  var layer = getActiveLayer();
  if (!layer) return;
  layer.bgCtx.clearRect(0, 0, layer.bgCanvas.width, layer.bgCanvas.height);
  layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  layer.objectLayer.innerHTML = '';
  layer.undoStack = [];
  layer.redoStack = [];
  saveSbSnapshot();
  showToast('图层已清空');
}

// ==========================================
// ===== 手账：贴纸系统完整版 =====
// ==========================================

// 1. 本地图片目录
const stickerData = {
  '拼贴': Array.from({length: 117}, (_, i) => `pin (${i + 1}).png`), 
  '蕾丝': Array.from({length: 60}, (_, i) => `lei (${i + 1}).png`), 
  '食物': Array.from({length: 74}, (_, i) => `shi (${i + 1}).png`),
  '动物': Array.from({length: 60}, (_, i) => `dong (${i + 1}).png`), 
  '边框': Array.from({length: 75}, (_, i) => `kuang (${i + 1}).png`),
  '像素': Array.from({length: 37}, (_, i) => `xiang (${i + 1}).png`),
  '便签': Array.from({length: 17}, (_, i) => `qian (${i + 1}).png`),
  '蝴蝶': Array.from({length: 28}, (_, i) => `hu (${i + 1}).png`),
  '暗黑哥特': Array.from({length: 27}, (_, i) => `an (${i + 1}).png`),
  '界面': Array.from({length: 68}, (_, i) => `jie (${i + 1}).png`),
  '文字': Array.from({length: 36}, (_, i) => `wen (${i + 1}).png`),
  '自定义': []
};

// 2. 初始化用户数据
if (!state.customStickers) state.customStickers = {}; 
if (!state.extraCategories) state.extraCategories = []; 
const DEFAULT_CATS = ['拼贴','蕾丝','食物','动物', '边框', '像素', '便签', '蝴蝶', '暗黑哥特', '界面', '文字', '自定义'];

if (!state.currentStickerCat) state.currentStickerCat = '拼贴';
var isStickerPanelOpen = false;
var isStickerEditMode = false;

// 3. 渲染分组栏
function renderStickerCategories() {
  var listEl = document.getElementById('stickerCategoryList');
  if (!listEl) return;

  var allCats = DEFAULT_CATS.concat(state.extraCategories);
  listEl.innerHTML = allCats.map(function(cat) {
    var isActive = (cat === state.currentStickerCat);
    return `<div class="sticker-cat-btn ${isActive ? 'active' : ''}" 
      onmousedown="startLongPress(event, '${cat}')" 
      ontouchstart="startLongPress(event, '${cat}')" 
      onmouseup="endLongPress()" 
      ontouchend="endLongPress()" 
      onclick="switchStickerCategory('${cat}')">${cat}</div>`;
  }).join('');
}

// ===== 长按删除分组 =====
var catPressTimer = null;
function startLongPress(e, cat) {
  if (DEFAULT_CATS.indexOf(cat) > -1) return; 
  catPressTimer = setTimeout(function() {
    if (confirm(`确定要删除分组「${cat}」以及里面的所有贴纸吗？`)) {
      state.extraCategories = state.extraCategories.filter(function(c) { return c !== cat; });
      delete state.customStickers[cat];
      state.currentStickerCat = '拼贴';
      saveState();
      renderStickerCategories();
      if (isStickerPanelOpen) renderStickerPanelContent();
      if (navigator.vibrate) navigator.vibrate(50);
    }
  }, 600); 
}
function endLongPress() {
  clearTimeout(catPressTimer);
}

// 4. 点击左侧 "+" 号（新建分组）
function addStickerCategory() {
  var name = prompt('请输入新分组名称：');
  if (!name || !name.trim()) return;
  name = name.trim();
  if (DEFAULT_CATS.includes(name) || state.extraCategories.includes(name)) {
    showToast('该分组已存在'); 
    return;
  }
  state.extraCategories.push(name);
  saveState();                      // 👈 加这一行
  switchStickerCategory(name);
  var listEl = document.getElementById('stickerCategoryList');
  setTimeout(function() { listEl.scrollLeft = listEl.scrollWidth; }, 100);
}

// 5. 切换分组
function switchStickerCategory(cat) {
  endLongPress(); 
  state.currentStickerCat = cat;
  saveState();                      // 👈 加这一行
  isStickerEditMode = false; 
  var btn = document.getElementById('stickerEditBtn');
  if(btn) { btn.textContent = '编辑'; btn.style.background = 'rgba(255,255,255,0.15)'; }
  renderStickerCategories();
  if (isStickerPanelOpen) {
    renderStickerPanelContent();
  }
}

// 6. 展开/收起面板
function toggleStickerPanel() {
  isStickerPanelOpen = !isStickerPanelOpen;
  var panel = document.getElementById('stickerPanelBody');
  var arrow = document.getElementById('stickerPanelArrow');

  if (isStickerPanelOpen) {
    panel.style.height = '260px'; 
    arrow.style.transform = 'rotate(180deg)'; 
    renderStickerPanelContent();
  } else {
    panel.style.height = '0px'; 
    arrow.style.transform = 'rotate(0deg)'; 
    isStickerEditMode = false;
  }
}

// 7. 切换编辑模式
function toggleStickerEditMode() {
  isStickerEditMode = !isStickerEditMode;
  var btn = document.getElementById('stickerEditBtn');
  if(btn) {
    btn.textContent = isStickerEditMode ? '完成' : '编辑';
    btn.style.background = isStickerEditMode ? 'rgba(255,59,48,0.8)' : 'rgba(255,255,255,0.15)';
  }
  renderStickerPanelContent();
}

// 8. 渲染面板内容
function renderStickerPanelContent() {
  var grid = document.getElementById('stickerGrid');
  var titleEl = document.getElementById('stickerPanelTitle');
  if (!grid) return;

  var cat = state.currentStickerCat;
  titleEl.textContent = cat; 

  var localImgs = stickerData[cat] || [];
  var customImgs = state.customStickers[cat] || [];

  var allItems = [];
  localImgs.forEach(function(name) { allItems.push({ src: './stickers/' + cat + '/' + name, isCustom: false }); });
  customImgs.forEach(function(b64) { allItems.push({ src: b64, isCustom: true }); });

  var html = '';

  // ✅ 修复：不管是不是空的，只要不是编辑模式，就渲染 + 号框
  if (!isStickerEditMode) {
    html += `
      <div onclick="document.getElementById('stickerUploadInput').click()" 
           style="background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.2); border-radius: 8px; display:flex; justify-content:center; align-items:center; aspect-ratio: 1/1; cursor:pointer; transition: background 0.2s;"
           onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
           onmouseout="this.style.background='rgba(255,255,255,0.05)'">
        <span style="font-size:32px; color:rgba(255,255,255,0.5); font-weight:300;">+</span>
      </div>
    `;
  }

  // 如果一张图都没有，且处于编辑模式，显示提示
  if (allItems.length === 0 && isStickerEditMode) {
    grid.innerHTML = '<div style="grid-column: span 4; text-align: center; color: #999; font-size: 13px; margin-top: 20px;">这个分组还没有贴纸哦</div>';
    return;
  }

  allItems.forEach(function(item, index) {
    var deleteBtn = (isStickerEditMode && item.isCustom) 
      ? `<div onclick="event.stopPropagation();deleteCustomSticker('${cat}', ${index - localImgs.length})" style="position:absolute; top:-6px; right:-6px; width:20px; height:20px; background:var(--red); color:#fff; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:14px; box-shadow:0 2px 4px rgba(0,0,0,0.3); z-index:10; cursor:pointer;">×</div>` 
      : '';

    var clickAction = isStickerEditMode ? '' : `onclick="insertStickerToCanvas('${item.src}')"`;

    html += `
      <div ${clickAction} style="position:relative; background: rgba(255,255,255,0.1); border-radius: 8px; padding: 6px; cursor: pointer; display:flex; justify-content:center; align-items:center; aspect-ratio: 1/1;">
        <img src="${item.src}" style="max-width:100%; max-height:100%; object-fit:contain; pointer-events:none; opacity:${isStickerEditMode ? 0.6 : 1};">
        ${deleteBtn}
      </div>
    `;
  });
  
  grid.innerHTML = html;
}

// 9. 处理上传图片
function handleStickerUpload(e) {
  var files = e.target.files;
  if (!files || files.length === 0) return;
  
  var cat = state.currentStickerCat;
  showToast('正在处理图片...');
  
  if (!state.customStickers[cat]) state.customStickers[cat] = [];

  var total = files.length;
  var done = 0;
  var success = 0;

  Array.from(files).forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        try {
          var canvas = document.createElement('canvas');
          var MAX = 300, w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          
          state.customStickers[cat].push(canvas.toDataURL('image/png'));
          saveState();  // 👈 每张图都单独保存
          renderStickerPanelContent();
          success++;
        } catch(err) {
          console.error('单张贴纸保存失败:', err);
        }
        done++;
        if (done === total) {
          showToast('成功导入 ' + success + ' / ' + total + ' 张');
        }
      };
      img.onerror = function() {
        done++;
        if (done === total) {
          showToast('成功导入 ' + success + ' / ' + total + ' 张');
        }
      };
      img.src = ev.target.result;
    };
    reader.onerror = function() {
      done++;
      if (done === total) {
        showToast('成功导入 ' + success + ' / ' + total + ' 张');
      }
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

// 10. 删除自定义贴纸
function deleteCustomSticker(cat, index) {
  if (!confirm('确定删除这张贴纸吗？')) return;
  state.customStickers[cat].splice(index, 1);
  saveState();
  renderStickerPanelContent();
  showToast('已删除');
}

// 11. 插入到画布
function insertStickerToCanvas(imgSrc) {
  createSbObject('image', imgSrc, 100, 100);
  showToast('已添加');
}

// 12. 初始化分组
setTimeout(function() {
  if (document.getElementById('stickerCategoryList')) {
    renderStickerCategories();
  }
}, 500);

// ==========================================
// ===== 梦角自动创作手账系统 =====
// ==========================================

function loadImageForScrapbook(src) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.onload = function() { resolve(img); };
    img.onerror = function() { reject(new Error('加载失败: ' + src)); };
    img.src = src;
  });
}

function sbRectsOverlap(a, b, margin) {
  margin = margin || 0;
  return !(a.x + a.w + margin < b.x ||
           b.x + b.w + margin < a.x ||
           a.y + a.h + margin < b.y ||
           b.y + b.h + margin < a.y);
}

function sbFindFreePosition(placed, w, h, canvasW, canvasH) {
  for (var tries = 0; tries < 60; tries++) {
    var x = 10 + Math.random() * (canvasW - w - 20);
    var y = 10 + Math.random() * (canvasH - h - 20);
    var rect = { x: x, y: y, w: w, h: h };
    var overlap = false;
    for (var i = 0; i < placed.length; i++) {
      if (sbRectsOverlap(placed[i], rect, 6)) { overlap = true; break; }
    }
    if (!overlap) {
      placed.push(rect);
      return { x: x, y: y };
    }
  }
  return null;
}

function sbDrawRandomStrokes(ctx, W, H) {
  var colors = ['#ffb6c1', '#ffd700', '#87ceeb', '#98fb98', '#dda0dd', '#f0e68c', '#ffa07a', '#87cefa', '#ff9ec7', '#b8e6b8'];
  var strokeCount = 2 + Math.floor(Math.random() * 3);
  for (var i = 0; i < strokeCount; i++) {
    ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.lineWidth = 2 + Math.random() * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.45 + Math.random() * 0.35;
    ctx.beginPath();
    var x = 30 + Math.random() * (W - 60);
    var y = 30 + Math.random() * (H - 60);
    ctx.moveTo(x, y);
    var segments = 2 + Math.floor(Math.random() * 3);
    for (var j = 0; j < segments; j++) {
      var cx = 30 + Math.random() * (W - 60);
      var cy = 30 + Math.random() * (H - 60);
      var nx = 30 + Math.random() * (W - 60);
      var ny = 30 + Math.random() * (H - 60);
      ctx.quadraticCurveTo(cx, cy, nx, ny);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

async function generateAutoScrapbookPage(sb) {
  var dream = state.dreams.find(function(d) { return d.id === sb.ownerId; });
  if (!dream) return;

  // 选一个空的侧页
  if (!sb.pages || sb.pages.length === 0) {
    sb.pages = [{ left: '', right: '' }];
  }
  
  var pageIdx = -1;
  var side = 'left';
  
  // 【核心修复】：从第一页开始扫，填满所有的左页和右页
  for (var i = 0; i < sb.pages.length; i++) {
    if (!sb.pages[i].left) {
      pageIdx = i; side = 'left'; break;
    }
    if (!sb.pages[i].right) {
      pageIdx = i; side = 'right'; break;
    }
  }
  
  // 如果所有页面都被填满了，才新开一页
  if (pageIdx === -1) {
    sb.pages.push({ left: '', right: '' });
    pageIdx = sb.pages.length - 1;
    side = 'left';
  }

  // 收集全部贴纸（默认 + 用户自定义）
  var allStickerSrcs = [];
  Object.keys(stickerData).forEach(function(cat) {
    (stickerData[cat] || []).forEach(function(name) {
      allStickerSrcs.push('./stickers/' + cat + '/' + name);
    });
  });
  if (state.customStickers) {
    Object.keys(state.customStickers).forEach(function(cat) {
      (state.customStickers[cat] || []).forEach(function(b64) {
        allStickerSrcs.push(b64);
      });
    });
  }

  // 字卡
  var cards = getUsableCards(dream.id);

  // 画布
  var W = 450, H = 600;
  var canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // 1. 随机笔画
  sbDrawRandomStrokes(ctx, W, H);

  // 2. 贴纸 3-8 张，随机位置，不重叠
  var placed = [];
  if (allStickerSrcs.length > 0) {
    var stkCount = 3 + Math.floor(Math.random() * 6);
    var shuffledStk = allStickerSrcs.slice().sort(function() { return Math.random() - 0.5; });
    var pickedStk = shuffledStk.slice(0, Math.min(stkCount, shuffledStk.length));
    for (var si = 0; si < pickedStk.length; si++) {
      try {
        var img = await loadImageForScrapbook(pickedStk[si]);
        var maxSize = 50 + Math.random() * 40;
        var w = img.width, h = img.height;
        if (w > h) { h *= maxSize / w; w = maxSize; }
        else { w *= maxSize / h; h = maxSize; }
        var pos = sbFindFreePosition(placed, w, h, W, H);
        if (!pos) continue;
        ctx.save();
        ctx.translate(pos.x + w / 2, pos.y + h / 2);
        ctx.rotate((Math.random() - 0.5) * 0.5);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      } catch (err) {
        console.warn('贴纸跳过：', pickedStk[si], err);
      }
    }
  }

  // 3. 字卡文字 1-5 张，随机位置，不重叠
  if (cards.length > 0) {
    var cardCount = 1 + Math.floor(Math.random() * 5);
    var shuffledCards = cards.slice().sort(function() { return Math.random() - 0.5; });
    var pickedCards = shuffledCards.slice(0, Math.min(cardCount, shuffledCards.length));
    for (var ci = 0; ci < pickedCards.length; ci++) {
      try {
        var txt = pickedCards[ci].text || '';
        if (!txt) continue;
        var textImgData = textToImage(txt, 24, '#1d1d1f');
        var img2 = await loadImageForScrapbook(textImgData.dataUrl);
        var w2 = Math.min(textImgData.width, 250);
        var h2 = textImgData.height * (w2 / textImgData.width);
        var pos2 = sbFindFreePosition(placed, w2, h2, W, H);
        if (!pos2) continue;
        ctx.save();
        ctx.translate(pos2.x + w2 / 2, pos2.y + h2 / 2);
        ctx.rotate((Math.random() - 0.5) * 0.25);
        ctx.drawImage(img2, -w2 / 2, -h2 / 2, w2, h2);
        ctx.restore();
      } catch (err) {
        console.warn('字卡跳过：', pickedCards[ci], err);
      }
    }
  }

  // 4. 导出为图片
  var dataUrl;
  try {
    dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.error('手账合成导出失败：', err);
    throw err;
  }

  sb.pages[pageIdx][side] = dataUrl;
  sb.pages[pageIdx][side + 'Bg'] = dataUrl;
  sb.pages[pageIdx][side + 'Objs'] = [];

  // 5. 私聊里加系统消息
  if (!state.chatSessions[dream.id]) state.chatSessions[dream.id] = [];
  state.chatSessions[dream.id].push({
    from: 'system',
    text: '「' + dream.name + '」创作了一页新的手账',
    time: Date.now()
  });

  // 6. 保存 + 刷新界面
  saveState();
  showToast('「' + dream.name + '」创作了一页新的手账');
  try { renderChatList(); } catch (e) {}
  if (document.getElementById('pageScrapbook').classList.contains('active')) {
    try { renderScrapbookList(); } catch (e) {}
  }
  if (state.currentChatId === dream.id) {
    try { loadChatMessages(); renderChatMessages(); } catch (e) {}
  }
}

function checkAutoScrapbook() {
  if (!state.scrapbooks || state.scrapbooks.length === 0) return;
  var now = Date.now();
  var ONE_DAY = 24 * 60 * 60 * 1000;

  var toProcess = [];
  state.scrapbooks.forEach(function(sb) {
    if (sb.ownerId === 'user') return;
    if (!sb.lastAutoPageAt) {
      sb.lastAutoPageAt = sb.createdAt || now;
      return;
    }
    if (now - sb.lastAutoPageAt >= ONE_DAY) {
      toProcess.push(sb);
    }
  });

  if (toProcess.length === 0) {
    saveState();
    return;
  }

  toProcess.forEach(function(sb) {
    if (Math.random() > 0.30) {
      sb.lastAutoPageAt = now;
      saveState();
      return;
    }
    generateAutoScrapbookPage(sb).then(function() {
      sb.lastAutoPageAt = Date.now();
      saveState();
    }).catch(function(err) {
      console.error('梦角自动创作手账失败：', err);
      sb.lastAutoPageAt = now;
      saveState();
    });
  });
}

// ===== 手账：双指缩放逻辑 =====
function initSbPinchZoom() {
  var container = document.getElementById('sbCanvasContainer');
  if (!container || container._pinchBound) return;
  container._pinchBound = true;
  
  var initialDistance = 0;
  var initialScale = 1;
  
  container.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      isDrawing = false; // 强制停止画画
      initialDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialScale = window._sbCanvasScale || 1;
    }
  }, { passive: false });
  
  container.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
      e.preventDefault(); // 阻止浏览器默认缩放
      var dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (initialDistance > 0) {
        var newScale = initialScale * (dist / initialDistance);
        newScale = Math.max(0.5, Math.min(3, newScale)); // 限制在 0.5倍 到 3倍
        window._sbCanvasScale = newScale;
        var wrapper = document.getElementById('sbCanvasWrapper');
        if (wrapper) wrapper.style.transform = 'scale(' + newScale + ')';
      }
    }
  }, { passive: false });
  
  container.addEventListener('touchend', function(e) {
    if (e.touches.length < 2) {
      initialDistance = 0;
    }
  });
}

// ==========================================
// ===== 手账：图层系统核心代码 =====
// ==========================================
var sbLayers = [];
var activeLayerId = null;

function getActiveLayer() {
  return sbLayers.find(l => l.id === activeLayerId);
}

function createSbLayer(name) {
  var w = sbCanvas.width || 800;
  var h = sbCanvas.height || 600;
  var id = 'layer_' + Date.now() + Math.random().toString(36).slice(2,6);
  var container = document.createElement('div');
  container.className = 'sb-layer-container';
  // 👇 核心修复：加上 isolation:isolate;
  container.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; isolation: isolate;';
  
  var canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%;';
  var bgCanvas = document.createElement('canvas');
  bgCanvas.width = w; bgCanvas.height = h;
  var objectLayer = document.createElement('div');
  objectLayer.className = 'sb-layer-objects';
  objectLayer.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10; overflow:hidden;';
  
  container.appendChild(canvas);
  container.appendChild(objectLayer);
  document.getElementById('sbLayersStack').appendChild(container);
  
  var layer = {
    id: id, name: name || ('图层 ' + (sbLayers.length + 1)),
    visible: true, opacity: 1, blendMode: 'normal',
    container: container, canvas: canvas, ctx: canvas.getContext('2d'),
    bgCanvas: bgCanvas, bgCtx: bgCanvas.getContext('2d'),
    objectLayer: objectLayer, undoStack: [], redoStack: []
  };
  sbLayers.push(layer);
  renderLayersUI();
  return layer;
}

function addSbLayer() {
  createSbLayer('图层 ' + (sbLayers.length + 1));
  activeLayerId = sbLayers[sbLayers.length - 1].id;
  renderLayersUI();
}

function toggleSbLayersPanel() {
  var p = document.getElementById('sbLayersPanel');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
  renderLayersUI();
}

function generateThumbnail(layer) {
  try {
    var tCanvas = document.createElement('canvas');
    tCanvas.width = 40; tCanvas.height = 40;
    var tCtx = tCanvas.getContext('2d');
    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, 40, 40);
    tCtx.drawImage(layer.bgCanvas, 0, 0, 40, 40);
    
    var canvasRect = layer.canvas.getBoundingClientRect();
    if (canvasRect.width > 0) {
      var scaleX = 40 / canvasRect.width;
      var scaleY = 40 / canvasRect.height;
      Array.from(layer.objectLayer.children).forEach(function(obj) {
        var img = obj.querySelector('img') || obj.querySelector('canvas');
        if (!img) return;
        var rect = obj.getBoundingClientRect();
        var x = (rect.left - canvasRect.left + rect.width / 2) * scaleX;
        var y = (rect.top - canvasRect.top + rect.height / 2) * scaleY;
        var w = rect.width * scaleX;
        var h = rect.height * scaleY;
        var angle = parseFloat(obj.dataset.rotate || 0) * Math.PI / 180;
        tCtx.save();
        tCtx.translate(x, y);
        tCtx.rotate(angle);
        tCtx.drawImage(img, -w/2, -h/2, w, h);
        tCtx.restore();
      });
    }
    return tCanvas.toDataURL('image/png');
  } catch(e) {
    return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%23ccc%22/%3E%3C/svg%3E';
  }
}

function renderLayersUI() {
  var list = document.getElementById('sbLayersList');
  if (!list) return;
  var html = '';
  
  for (var i = sbLayers.length - 1; i >= 0; i--) {
    var l = sbLayers[i];
    var isActive = l.id === activeLayerId;
    var bg = isActive ? '#007aff' : '#333';
    var eye = l.visible ? '👁' : '⚪';
    var thumb = generateThumbnail(l);
    
    // 注意这里：图片和文字都加了 pointer-events:none，只让最外层的 div 接收点击
    html += `<div onclick="selectSbLayer('${l.id}')" style="display:flex; align-items:center; padding:8px; border-bottom:1px solid #444; background:${bg}; cursor:pointer;">
      
      <div onclick="toggleLayerVis(event, '${l.id}')" style="padding:0 6px; font-size:14px; cursor:pointer; opacity:0.8; pointer-events:auto;">${eye}</div>
      
      <img src="${thumb}" draggable="false" style="width:36px; height:36px; border-radius:4px; object-fit:contain; border:1px solid #555; margin-right:8px; background:#fff; pointer-events:none;">
      
      <div style="flex:1; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none;">${l.name}</div>
      
      <div style="display:flex; gap:4px; margin-left:8px;">
        <div onclick="moveSbLayer(event, '${l.id}', 'up')" style="padding:4px 6px; background:rgba(255,255,255,0.1); border-radius:4px; cursor:pointer; font-size:12px; color:#fff; pointer-events:auto;">↑</div>
        <div onclick="moveSbLayer(event, '${l.id}', 'down')" style="padding:4px 6px; background:rgba(255,255,255,0.1); border-radius:4px; cursor:pointer; font-size:12px; color:#fff; pointer-events:auto;">↓</div>
      </div>
    </div>`;
  }
  list.innerHTML = html;
}

function selectSbLayer(id) {
  activeLayerId = id;
  renderLayersUI();
  openSbLayerSettings(id);
}

function openSbLayerSettings(id) {
  var l = sbLayers.find(x => x.id === id);
  if (!l) return;
  
  var titleEl = document.getElementById('sbLayerSetTitle');
  var opRange = document.getElementById('sbLayerOpacityRange');
  var opText = document.getElementById('sbLayerOpacityText');
  var blendText = document.getElementById('sbLayerBlendText');
  var panel = document.getElementById('sbLayerSettings');

  if (titleEl) titleEl.textContent = l.name + ' 设置';
  if (opRange) opRange.value = l.opacity * 100;
  if (opText) opText.textContent = Math.round(l.opacity * 100) + '%';
  if (blendText) blendText.textContent = getBlendName(l.blendMode);
  
  if (panel) {
    // 强制让面板在所有元素最上层显示
    panel.style.display = 'flex';
    panel.style.position = 'fixed';
    panel.style.zIndex = '2147483647';
  }
}

function toggleLayerVis(e, id) {
  e.stopPropagation();
  var l = sbLayers.find(x => x.id === id);
  if (!l) return;
  l.visible = !l.visible;
  l.container.style.display = l.visible ? 'block' : 'none';
  renderLayersUI();
}

function openSbLayerSettings(id) {
  var l = sbLayers.find(x => x.id === id);
  if (!l) return;
  document.getElementById('sbLayerSetTitle').textContent = l.name + ' 设置';
  document.getElementById('sbLayerOpacityRange').value = l.opacity * 100;
  document.getElementById('sbLayerOpacityText').textContent = Math.round(l.opacity * 100) + '%';
  document.getElementById('sbLayerBlendText').textContent = getBlendName(l.blendMode);
  document.getElementById('sbLayerSettings').style.display = 'flex';
}

function closeSbLayerSettings() {
  document.getElementById('sbLayerSettings').style.display = 'none';
}

function changeLayerOpacity(val) {
  var l = getActiveLayer();
  if (!l) return;
  l.opacity = val / 100;
  l.container.style.opacity = l.opacity;
  document.getElementById('sbLayerOpacityText').textContent = val + '%';
}

function duplicateSbLayer() {
  var l = getActiveLayer();
  if (!l) return;
  var newL = createSbLayer(l.name + ' 副本');
  newL.bgCtx.drawImage(l.bgCanvas, 0, 0);
  newL.ctx.drawImage(l.canvas, 0, 0);
  newL.objectLayer.innerHTML = l.objectLayer.innerHTML;
  closeSbLayerSettings();
}

function renameSbLayer() {
  var l = getActiveLayer();
  if (!l) return;
  var n = prompt('重命名图层：', l.name);
  if (n && n.trim()) {
    l.name = n.trim();
    renderLayersUI();
    document.getElementById('sbLayerSetTitle').textContent = l.name + ' 设置';
  }
}

function deleteSbLayer() {
  if (sbLayers.length <= 1) { showToast('至少保留一个图层'); return; }
  if (!confirm('确定删除此图层吗？')) return;
  var idx = sbLayers.findIndex(x => x.id === activeLayerId);
  if (idx > -1) {
    sbLayers[idx].container.remove();
    sbLayers.splice(idx, 1);
    activeLayerId = sbLayers[sbLayers.length - 1].id;
    closeSbLayerSettings();
    renderLayersUI();
  }
}

function clearActiveSbLayer() {
  var l = getActiveLayer();
  if (!l) return;
  l.bgCtx.clearRect(0, 0, l.bgCanvas.width, l.bgCanvas.height);
  l.ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
  l.objectLayer.innerHTML = '';
  saveSbSnapshot();
  closeSbLayerSettings();
  showToast('已清除');
}

function flipSbLayer(dir) {
  var l = getActiveLayer();
  if (!l) return;
  
  // 【关键】：彻底清理之前遗留的镜像 CSS 状态，保证鼠标方向绝对正确
  l.objectLayer.style.transform = 'none';
  
  var w = l.canvas.width;
  var h = l.canvas.height;
  
  // 1. 翻转画笔画布（Canvas）
  var temp = document.createElement('canvas');
  temp.width = w; temp.height = h;
  var tCtx = temp.getContext('2d');
  
  if (dir === 'h') { tCtx.translate(w, 0); tCtx.scale(-1, 1); }
  else { tCtx.translate(0, h); tCtx.scale(1, -1); }
  
  tCtx.drawImage(l.bgCanvas, 0, 0);
  l.bgCtx.clearRect(0, 0, w, h);
  l.bgCtx.drawImage(temp, 0, 0);
  l.ctx.clearRect(0, 0, w, h);
  l.ctx.drawImage(temp, 0, 0);

  // 2. 物理翻转 DOM 贴纸（纯坐标计算）
  var wrapper = document.getElementById('sbCanvasWrapper');
  var actualW = wrapper.clientWidth;
  var actualH = wrapper.clientHeight;
  
  var objs = l.objectLayer.querySelectorAll('.sb-obj-wrapper');
  objs.forEach(function(obj) {
    var curLeft = obj.offsetLeft;
    var curTop = obj.offsetTop;
    var deg = parseFloat(obj.dataset.rotate || 0);
    var img = obj.querySelector('img') || obj.querySelector('canvas');
    
    if (dir === 'h') {
      obj.style.left = (actualW - curLeft) + 'px';
      obj.dataset.rotate = -deg;
      obj.style.transform = `translate(-50%,-50%) rotate(${-deg}deg)`;
      if (img) {
        img.style.transform = (img.style.transform === 'scaleX(-1)' ? 'none' : 'scaleX(-1)');
      }
    } else {
      obj.style.top = (actualH - curTop) + 'px';
      obj.dataset.rotate = -deg;
      obj.style.transform = `translate(-50%,-50%) rotate(${-deg}deg)`;
      if (img) {
        img.style.transform = (img.style.transform === 'scaleY(-1)' ? 'none' : 'scaleY(-1)');
      }
    }
  });
  
  saveSbSnapshot();
  renderLayersUI();
  showToast('已翻转');
}

function getBlendName(val) {
  var b = BLEND_MODES.find(x => x.value === val);
  return b ? b.name : '正常';
}

function openSbBlendModePicker() {
  var list = document.getElementById('sbBlendList');
  var l = getActiveLayer();
  if (!l) return;
  list.innerHTML = BLEND_MODES.map(m => `
    <div onclick="setSbBlendMode('${m.value}')" style="padding:8px 16px; background:${l.blendMode===m.value?'#007aff':'#444'}; border-radius:8px; white-space:nowrap; font-size:14px; cursor:pointer; color:#fff;">
      ${m.name}
    </div>
  `).join('');
  document.getElementById('sbBlendPicker').style.display = 'block';
}

function closeSbBlendModePicker() {
  document.getElementById('sbBlendPicker').style.display = 'none';
}

function setSbBlendMode(val) {
  var l = getActiveLayer();
  if (!l) return;
  l.blendMode = val;
  l.container.style.isolation = 'isolate'; // 强制隔离
  l.container.style.mixBlendMode = val === 'normal' ? 'normal' : val;
  
  document.getElementById('sbLayerBlendText').textContent = getBlendName(val);
  closeSbBlendModePicker();
}

// ===== 图层上下移动 =====
function moveSbLayer(e, id, dir) {
  e.stopPropagation();
  var idx = sbLayers.findIndex(l => l.id === id);
  if (idx < 0) return;
  
  if (dir === 'up') {
    if (idx === sbLayers.length - 1) return; 
    var temp = sbLayers[idx];
    sbLayers[idx] = sbLayers[idx + 1];
    sbLayers[idx + 1] = temp;
  } else if (dir === 'down') {
    if (idx === 0) return; 
    var temp = sbLayers[idx];
    sbLayers[idx] = sbLayers[idx - 1];
    sbLayers[idx - 1] = temp;
  }
  
  var stack = document.getElementById('sbLayersStack');
  stack.innerHTML = '';
  sbLayers.forEach(function(l) {
    stack.appendChild(l.container);
  });
  renderLayersUI();
}

// ===== 补上丢失的混合模式定义 =====
const BLEND_MODES = [
  { name: '正常', value: 'normal' },
  { name: '正片叠底', value: 'multiply' },
  { name: '颜色加深', value: 'color-burn' },
  { name: '线性减淡', value: 'color-dodge' },
  { name: '滤色', value: 'screen' },
  { name: '叠加', value: 'overlay' },
  { name: '柔光', value: 'soft-light' },
  { name: '加亮', value: 'lighten' },
  { name: '加暗', value: 'darken' },
  { name: '差值', value: 'difference' }
];

// ==========================================
// ===== 五子棋系统 核心逻辑 =====
// ==========================================
let gomoku = {
  board: [],           
  active: false,       
  dreamId: null,       
  userColor: 1,        
  aiColor: 2,          
  currentTurn: 1,      
  isUserTurn: true,    
  userUndoLeft: 3,     
  aiUndoLeft: 3,       
  moveHistory: [],     
  chats: [],
  mode: 'pvp',          // 模式：pvp(自己下) 或 spectate(看戏)
  spectateMatchId: null, // 正在看哪场比赛
};

function openGomokuGame() {
  navigateTo('pageGomoku');
  resetGomokuGame();
}

function resetGomokuGame() {
  gomoku.active = false;
  gomoku.board = Array(15).fill(0).map(() => Array(15).fill(0));
  gomoku.moveHistory = [];
  gomoku.chats = [];
  gomoku.userUndoLeft = 3;
  gomoku.aiUndoLeft = 3;
  
  if (Math.random() < 0.5) {
    gomoku.userColor = 1; gomoku.aiColor = 2;
  } else {
    gomoku.userColor = 2; gomoku.aiColor = 1;
  }

  // 👇 修复：只有在当前没有选中梦角时，才默认选第一个
  if (!gomoku.dreamId && state.dreams && state.dreams.length > 0) {
    gomoku.dreamId = state.dreams[0].id;
  }

  updateGomokuUI();
  setTimeout(drawGomokuBoard, 50);
  renderGomokuChats();
}

function exitGomoku() {
  gomoku.chats = []; 
  gomoku.active = false;
  gomoku.mode = 'pvp';
  gomoku.spectateMatchId = null;
  navigateTo('pageGame');
}

function updateGomokuUI() {
  var sideBtns = document.getElementById('gomokuSideBtns');
  var turnEl = document.getElementById('gomokuTurnIndicator');
  var overlay = document.getElementById('gomokuStartOverlay');
  var dreamSelector = document.getElementById('gomokuDreamSelector');

  if (gomoku.mode === 'spectate') {
    if (sideBtns) sideBtns.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    if (dreamSelector) dreamSelector.style.display = 'none'; // 👈 隐藏顶部长条
    
    var match = state.gomokuAiMatches.find(m => m.id === gomoku.spectateMatchId);
    if (match) {
      var p1ColStr = match.p1Color === 1 ? '⚫黑' : '⚪白';
      var p2ColStr = match.p2Color === 1 ? '⚫黑' : '⚪白';
      document.getElementById('gomokuDreamAvatar').src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%2720%27 fill=%27%23eee%27/%3E%3C/svg%3E';
      document.getElementById('gomokuDreamName').textContent = match.p1Name + '(' + p1ColStr + ') vs ' + match.p2Name + '(' + p2ColStr + ')';
      document.getElementById('gomokuDreamStatus').textContent = '对局观战中';
      
      document.getElementById('gomokuUserColor').innerHTML = `${match.p1Name}：${match.p1Color === 1 ? '⚫ 黑棋' : '⚪ 白棋'} &nbsp; | &nbsp; ${match.p2Name}：${match.p2Color === 1 ? '⚫ 黑棋' : '⚪ 白棋'}`;
      
      if (match.active) {
        var currentPlayerName = gomoku.currentTurn === 1 ? (match.p1Color === 1 ? match.p1Name : match.p2Name) : (match.p2Color === 1 ? match.p2Name : match.p1Name);
        turnEl.textContent = currentPlayerName + ' 思考中...';
        turnEl.style.color = '#ff9500';
        turnEl.style.background = 'rgba(255,149,0,0.1)';
      } else {
        turnEl.textContent = '对局已结束';
        turnEl.style.color = '#86868b';
        turnEl.style.background = '#f0f0f5';
      }
    }
    return; 
  }

  // PVP模式 (正常下棋)
  if (sideBtns) sideBtns.style.display = 'flex';
  if (dreamSelector) dreamSelector.style.display = 'flex'; // 👈 恢复显示
  if (!gomoku.dreamId) return;
  var d = state.dreams.find(x => x.id === gomoku.dreamId);
  if (!d) return;

  document.getElementById('gomokuDreamAvatar').src = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%2720%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2720%27 y=%2725%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2716%27%3E💜%3C/text%3E%3C/svg%3E';
  document.getElementById('gomokuDreamName').textContent = d.name;
  document.getElementById('gomokuDreamStatus').textContent = d.currentStatus || '在线';
  
  var userColorStr = gomoku.userColor === 1 ? '黑棋' : '白棋';
  var aiColorStr = gomoku.aiColor === 1 ? '黑棋' : '白棋';
  var colorDot = gomoku.userColor === 1 ? '⚫' : '⚪';
  document.getElementById('gomokuUserColor').innerHTML = `我：${colorDot} ${userColorStr} &nbsp; | &nbsp; ${d.name}：${gomoku.aiColor === 1 ? '⚫' : '⚪'} ${aiColorStr}`;

  document.getElementById('gomokuUndoCount').textContent = gomoku.userUndoLeft;

  if (overlay) {
    overlay.style.display = gomoku.active ? 'none' : 'flex';
    var startBtn = document.getElementById('gomokuStartBtn');
    if (startBtn) startBtn.textContent = gomoku.moveHistory.length > 0 ? '再来一局' : '开始游戏';
  }

  if (!gomoku.active) {
    turnEl.textContent = gomoku.moveHistory.length === 0 ? '未开始' : '游戏结束';
    turnEl.style.color = '#86868b';
    turnEl.style.background = '#f0f0f5';
  } else {
    if (gomoku.isUserTurn) {
      turnEl.textContent = '你的回合';
      turnEl.style.color = 'var(--blue)';
      turnEl.style.background = 'rgba(0,122,255,0.1)';
    } else {
      turnEl.textContent = d.name + ' 思考中...';
      turnEl.style.color = '#ff9500';
      turnEl.style.background = 'rgba(255,149,0,0.1)';
    }
  }
}

function saveGomokuHistory(winner, reason) {
  if (!state.gomokuHistory) state.gomokuHistory = [];
  if (!gomoku.startTime) return; // 防止脏数据

  var dream = state.dreams.find(x => x.id === gomoku.dreamId);
  var record = {
    id: 'gh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    startTime: gomoku.startTime,
    endTime: Date.now(),
    duration: Math.floor((Date.now() - gomoku.startTime) / 1000),
    dreamId: gomoku.dreamId,
    dreamName: dream ? dream.name : '未知梦角',
    dreamAvatar: dream ? dream.avatar : '',
    userColor: gomoku.userColor,
    winner: winner, // 'user', 'dream', 'draw'
    reason: reason  // 'five', 'resign'
  };
  
  state.gomokuHistory.push(record);
  saveState();
  gomoku.startTime = null; // 清空，防止重复记录
}

function startGomokuMatch() {
  if (!gomoku.dreamId) { showToast('请先选择梦角'); return; }

   // 👈 新增检查
  if (state.gomokuAiMatches && state.gomokuAiMatches.some(m => m.active && (m.p1Id === gomoku.dreamId || m.p2Id === gomoku.dreamId))) {
    return showToast('该梦角正在与其他梦角对弈中，请稍后再试');
  }

  // 重置棋盘，但不清空聊天记录
  gomoku.board = Array(15).fill(0).map(() => Array(15).fill(0));
  gomoku.moveHistory = [];
  gomoku.userUndoLeft = 3;
  gomoku.aiUndoLeft = 3;

   gomoku.startTime = Date.now(); 
  
  // 重新随机黑白
  if (Math.random() < 0.5) {
    gomoku.userColor = 1; gomoku.aiColor = 2;
  } else {
    gomoku.userColor = 2; gomoku.aiColor = 1;
  }

  gomoku.active = true;
  gomoku.currentTurn = 1; // 黑棋先下
  gomoku.isUserTurn = (gomoku.userColor === 1);
  gomoku.startTime = Date.now(); // 记录本局开始时间
  
  updateGomokuUI();
  drawGomokuBoard();
  addGomokuChat('system', `游戏开始！你执${gomoku.userColor === 1 ? '黑' : '白'}，${getDreamName(gomoku.dreamId)}执${gomoku.aiColor === 1 ? '黑' : '白'}。`);
  
  if (!gomoku.isUserTurn) {
    setTimeout(aiGomokuMove, 800);
  }
}

function drawGomokuBoard() {
  var canvas = document.getElementById('gomokuCanvas');
  if (!canvas) return;
  
  var rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return; 

  var dpr = window.devicePixelRatio || 1;
  var w = rect.width;
  
  // 动态设置高清画布尺寸
  canvas.width = w * dpr;
  canvas.height = w * dpr;

  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, w);
  ctx.fillStyle = '#e6c280';
  ctx.fillRect(0, 0, w, w);

  var pad = 15;
  var cs = (w - pad * 2) / 14; 

  ctx.strokeStyle = '#8b6b40';
  ctx.lineWidth = 1;

  for (var i = 0; i < 15; i++) {
    ctx.beginPath(); ctx.moveTo(pad, pad + i * cs); ctx.lineTo(pad + 14 * cs, pad + i * cs); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad + i * cs, pad); ctx.lineTo(pad + i * cs, pad + 14 * cs); ctx.stroke();
  }

  var stars = [[3,3], [11,3], [3,11], [11,11], [7,7]];
  ctx.fillStyle = '#8b6b40';
  stars.forEach(function(s) {
    ctx.beginPath(); ctx.arc(pad + s[0] * cs, pad + s[1] * cs, 3, 0, Math.PI * 2); ctx.fill();
  });

  for (var y = 0; y < 15; y++) {
    for (var x = 0; x < 15; x++) {
      if (gomoku.board[y][x] !== 0) {
        drawChessPiece(ctx, x, y, gomoku.board[y][x], cs, pad);
      }
    }
  }
}

function drawChessPiece(ctx, x, y, color, cs, pad) {
  var cx = pad + x * cs;
  var cy = pad + y * cs;
  var r = cs * 0.42;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  
  if (color === 1) { 
    ctx.fillStyle = '#333'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r*0.3, cy - r*0.3, r*0.2, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
  } else { 
    ctx.fillStyle = '#f8f8f8'; ctx.fill(); ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - r*0.3, cy - r*0.3, r*0.2, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
  }
}

document.getElementById('gomokuClickLayer').addEventListener('click', function(e) {
    if (gomoku.mode === 'spectate') return; 
  if (!gomoku.active || !gomoku.isUserTurn) return;
  
  var canvas = document.getElementById('gomokuCanvas');
  var rect = canvas.getBoundingClientRect();
  var w = rect.width;
  var pad = 15;
  var cs = (w - pad * 2) / 14;
  
  var clickX = e.clientX - rect.left;
  var clickY = e.clientY - rect.top;
  
  var gx = Math.round((clickX - pad) / cs);
  var gy = Math.round((clickY - pad) / cs);
  
  if (gx >= 0 && gx < 15 && gy >= 0 && gy < 15) {
    if (gomoku.board[gy][gx] === 0) {
      makeGomokuMove(gx, gy, gomoku.userColor, true);
    }
  }
});

function checkGomokuWin(x, y, color) {
  var dirs = [[1,0], [0,1], [1,1], [1,-1]];
  for (var i = 0; i < dirs.length; i++) {
    var count = 1;
    for (var j = 1; j < 5; j++) {
      var nx = x + dirs[i][0] * j, ny = y + dirs[i][1] * j;
      if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && gomoku.board[ny][nx] === color) count++;
      else break;
    }
    for (var j = 1; j < 5; j++) {
      var nx = x - dirs[i][0] * j, ny = y - dirs[i][1] * j;
      if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && gomoku.board[ny][nx] === color) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

function userUndo() {
  if (!gomoku.active) return showToast('游戏未开始');
  if (gomoku.userUndoLeft <= 0) return showToast('悔棋次数用完了');
  if (gomoku.moveHistory.length < 2) return showToast('还没下几步呢');

  var lastMove1 = gomoku.moveHistory.pop();
  gomoku.board[lastMove1.y][lastMove1.x] = 0;
  var lastMove2 = gomoku.moveHistory.pop();
  gomoku.board[lastMove2.y][lastMove2.x] = 0;

  gomoku.userUndoLeft--;
  gomoku.isUserTurn = true; 
  gomoku.currentTurn = gomoku.userColor;
  
  updateGomokuUI();
  drawGomokuBoard();
  showToast('悔棋成功');
}

// ===== 替换原来的 makeGomokuMove =====
function makeGomokuMove(x, y, color, isUser) {
  gomoku.board[y][x] = color;
  gomoku.moveHistory.push({x: x, y: y, color: color});
  drawGomokuBoard();

  var winner = checkGomokuWin(x, y, color);
  if (winner) {
    gomoku.active = false;
    updateGomokuUI();
    if (color === gomoku.userColor) {
      addGomokuChat('system', `🎉 你赢了！`);
      showToast('你赢了！');
      saveGomokuHistory('user', 'five'); // 记录：用户五子连珠赢了
    } else {
      addGomokuChat('system', `💀 ${getDreamName(gomoku.dreamId)} 赢了！`);
      showToast('你输了');
      saveGomokuHistory('dream', 'five'); // 记录：梦角五子连珠赢了
    }
    return;
  }

  if (gomoku.moveHistory.length >= 225) {
    gomoku.active = false;
    updateGomokuUI();
    addGomokuChat('system', `平局！棋盘满了。`);
    saveGomokuHistory('draw', 'full'); // 记录：平局
    return;
  }

  gomoku.currentTurn = color === 1 ? 2 : 1;
  gomoku.isUserTurn = (gomoku.currentTurn === gomoku.userColor);
  updateGomokuUI();

  if (!gomoku.isUserTurn && gomoku.active) {
    setTimeout(aiGomokuMove, 800 + Math.random() * 500);
  }
}

// ===== 替换原来的 userResign =====
function userResign() {
  if (!gomoku.active) return;
  if (!confirm('确定要认输吗？')) return;
  gomoku.active = false;
  updateGomokuUI();
  addGomokuChat('system', `你认输了，${getDreamName(gomoku.dreamId)} 获得胜利。`);
  saveGomokuHistory('dream', 'resign'); // 记录：用户认输，梦角赢
}

// ===== 替换原来的 aiGomokuMove =====
function aiGomokuMove(isUndoAction) {
  if (!gomoku.active || gomoku.isUserTurn) return;

  if (Math.random() < 0.01) { // 1%概率认输
    gomoku.active = false;
    updateGomokuUI();
    addGomokuChat('system', `${getDreamName(gomoku.dreamId)} 认输了！你赢了！`);
    showToast('梦角认输了！');
    saveGomokuHistory('user', 'resign');
    return;
  }

  // 悔棋逻辑 (5%概率)
  if (!isUndoAction && Math.random() < 0.05 && gomoku.aiUndoLeft > 0 && gomoku.moveHistory.length >= 3) {
    var lastMove1 = gomoku.moveHistory.pop();
    gomoku.board[lastMove1.y][lastMove1.x] = 0;
    var lastMove2 = gomoku.moveHistory.pop();
    gomoku.board[lastMove2.y][lastMove2.x] = 0;
    
    gomoku.aiUndoLeft--;
    updateGomokuUI();
    drawGomokuBoard();
    addGomokuChat('dream', `哎呀，下错了，我悔个棋~`);
    
    // 👇 核心修改：记录刚刚悔掉的那个位置，下次绝对不许下这
    window._gomokuForbiddenMove = { x: lastMove1.x, y: lastMove1.y };
    
    setTimeout(function() { aiGomokuMove(true); }, 1000); 
    return;
  }

  if (gomoku.moveHistory.length === 0) {
    makeGomokuMove(7, 7, gomoku.aiColor, false);
    return;
  }

  var maxMyScore = -1, maxEnemyScore = -1;
  var bestMyMoves = [], bestEnemyMoves = [];

  for (var y = 0; y < 15; y++) {
    for (var x = 0; x < 15; x++) {
      if (gomoku.board[y][x] === 0) {
        // 👇 核心修改：如果是悔棋后的重算，直接跳过刚刚悔掉的点！
        if (isUndoAction && window._gomokuForbiddenMove && x === window._gomokuForbiddenMove.x && y === window._gomokuForbiddenMove.y) {
            continue; 
        }

        var myScore = evaluateGomokuPoint(x, y, gomoku.aiColor);
        var enemyScore = evaluateGomokuPoint(x, y, gomoku.userColor);
        
        if (myScore > maxMyScore) { maxMyScore = myScore; bestMyMoves = [{x, y}]; }
        else if (myScore === maxMyScore) bestMyMoves.push({x, y});

        if (enemyScore > maxEnemyScore) { maxEnemyScore = enemyScore; bestEnemyMoves = [{x, y}]; }
        else if (enemyScore === maxEnemyScore) bestEnemyMoves.push({x, y});
      }
    }
  }

  var move = null;
  if (maxMyScore >= 10000000) move = bestMyMoves[Math.floor(Math.random() * bestMyMoves.length)];
  else if (maxEnemyScore >= 10000000) move = bestEnemyMoves[Math.floor(Math.random() * bestEnemyMoves.length)];
  else if (maxMyScore >= 1000000) move = bestMyMoves[Math.floor(Math.random() * bestMyMoves.length)];
  else if (maxEnemyScore >= 1000000) move = bestEnemyMoves[Math.floor(Math.random() * bestEnemyMoves.length)];
  else {
    var bestScore = -1;
    var bestMoves = [];
    for (var y = 0; y < 15; y++) {
      for (var x = 0; x < 15; x++) {
        if (gomoku.board[y][x] === 0) {
          if (isUndoAction && window._gomokuForbiddenMove && x === window._gomokuForbiddenMove.x && y === window._gomokuForbiddenMove.y) {
              continue;
          }
          var score = evaluateGomokuPoint(x, y, gomoku.aiColor) + evaluateGomokuPoint(x, y, gomoku.userColor) * 0.9;
          score += Math.random() * 0.1; 
          if (score > bestScore) { bestScore = score; bestMoves = [{x, y}]; }
          else if (score === bestScore) bestMoves.push({x, y});
        }
      }
    }
    // 为了防止极端情况（比如没地方下了），兜底判空
    if (bestMoves.length > 0) {
        move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    } else {
        // 如果全是禁手，就解除禁手
        window._gomokuForbiddenMove = null;
        aiGomokuMove(true); return;
    }
  }

  if (move) {
    window._gomokuForbiddenMove = null; // 下完之后清空记忆
    makeGomokuMove(move.x, move.y, gomoku.aiColor, false);
  }
}

function evaluateGomokuPoint(x, y, color) {
  var score = 0;
  var dirs = [[1,0], [0,1], [1,1], [1,-1]];
  
  for (var i = 0; i < 4; i++) {
    var count = 1; 
    var block1 = 0; 
    var block2 = 0; 
    
    for (var j = 1; j < 5; j++) {
      var nx = x + dirs[i][0] * j, ny = y + dirs[i][1] * j;
      if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) { block1 = 1; break; }
      if (gomoku.board[ny][nx] === color) count++;
      else if (gomoku.board[ny][nx] === 0) break;
      else { block1 = 1; break; }
    }
    
    for (var j = 1; j < 5; j++) {
      var nx = x - dirs[i][0] * j, ny = y - dirs[i][1] * j;
      if (nx < 0 || nx >= 15 || ny < 0 || ny >= 15) { block2 = 1; break; }
      if (gomoku.board[ny][nx] === color) count++;
      else if (gomoku.board[ny][nx] === 0) break;
      else { block2 = 1; break; }
    }
    
    var blocks = block1 + block2;
    
    if (count >= 5) score += 10000000; 
    else if (count === 4) {
      if (blocks === 0) score += 1000000; 
      else if (blocks === 1) score += 100000; 
    } else if (count === 3) {
      if (blocks === 0) score += 8000; 
      else if (blocks === 1) score += 1000; 
    } else if (count === 2) {
      if (blocks === 0) score += 500; 
      else if (blocks === 1) score += 100;
    } else if (count === 1) {
      if (blocks === 0) score += 10;
    }
  }
  return score;
}

// ===== 游戏内聊天逻辑 =====
function addGomokuChat(sender, text, senderId) {
  gomoku.chats.push({sender, text, senderId});
  renderGomokuChats();
}

function renderGomokuChats() {
  var list = document.getElementById('gomokuChatList');
  if (!list) return;
  
  if (gomoku.chats.length === 0) {
    list.innerHTML = '<div style="text-align:center;font-size:12px;color:#bbb;margin-top:20px;">这里可以聊天，退出后自动清空</div>';
    return;
  }

  var userAvatar = state.profile.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2716%27 fill=%27%23e8e8ed%27/%3E%3Ctext x=%2716%27 y=%2720%27 text-anchor=%27middle%27 fill=%27%2386868b%27 font-size=%2712%27%3E👤%3C/text%3E%3C/svg%3E';
  
  // 默认对局头像
  var defaultDreamAv = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2716%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2716%27 y=%2720%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2712%27%3E💜%3C/text%3E%3C/svg%3E';

  var currentStyle = (typeof chatSettings !== 'undefined' && chatSettings.bubbleStyle) ? chatSettings.bubbleStyle : 'default';
  var styleClass = 'bubble-' + currentStyle;
  var useInlineStyle = (currentStyle === 'default');

  var cs = { bubbleUser: null, bubbleDream: null, fontColor: null };
  if (state.settings && state.settings.chatSettingsMap && state.settings.chatSettingsMap[gomoku.dreamId]) {
    cs = state.settings.chatSettingsMap[gomoku.dreamId];
  }
  
  var finalUser = cs.bubbleUser || (state.settings && state.settings.globalBubbleUser) || '#e8e8ed';
  var finalDream = cs.bubbleDream || (state.settings && state.settings.globalBubbleDream) || '#e8e8ed';
  var finalFont = cs.fontColor || (state.settings && state.settings.globalFontColor) || '#1d1d1f';
  
  var userBg = useInlineStyle ? 'background:' + finalUser + ';' : '';
  var dreamBg = useInlineStyle ? 'background:' + finalDream + ';' : '';
  var textColor = 'color:' + finalFont + ';';

  var specificCSS = (state.chatCustomStyles && state.chatCustomStyles[gomoku.dreamId]) ? state.chatCustomStyles[gomoku.dreamId] : '';
  var globalCSS = (state.settings && state.settings.globalChatCSS) ? state.settings.globalChatCSS : '';
  
  var styleEl = document.getElementById('gomoku-custom-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'gomoku-custom-style';
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = specificCSS || globalCSS;

  list.innerHTML = gomoku.chats.map(function(c) {
    if (c.sender === 'system') {
      return `<div style="text-align:center;font-size:11px;color:#999;margin:4px 0;">${c.text}</div>`;
    }
    
    var isUser = c.sender === 'user';
    var bubbleClass = 'chat-bubble ' + (isUser ? 'bubble-user' : 'bubble-dream') + ' ' + styleClass;
    var bgStyle = isUser ? userBg : dreamBg;

    var avatar = userAvatar;
    if (!isUser) {
      if (gomoku.mode === 'spectate' && c.senderId) {
        var sd = state.dreams.find(x => x.id === c.senderId);
        avatar = sd && sd.avatar ? sd.avatar : defaultDreamAv;
      } else {
        var d = state.dreams.find(x => x.id === gomoku.dreamId);
        avatar = d && d.avatar ? d.avatar : defaultDreamAv;
      }
    }

    var html = `<div style="display:flex; justify-content:${isUser ? 'flex-end' : 'flex-start'}; align-items:flex-start; gap:8px; margin-bottom:8px;">`;

    if (!isUser) {
      html += `<img src="${avatar}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,0.1);">`;
    }

    html += `<div style="max-width:70%; display:flex; flex-direction:column; align-items:${isUser ? 'flex-end' : 'flex-start'};">`;
    html += `<div class="${bubbleClass}" style="${bgStyle} ${textColor}">${escapeHtml(c.text)}</div>`;
    html += `</div>`;

    if (isUser) {
      html += `<img src="${avatar}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,0.1);">`;
    }

    html += `</div>`;
    return html;
  }).join('');
  
  list.scrollTop = list.scrollHeight;
}

function sendGomokuChat() {
  if (!gomoku.dreamId && gomoku.mode !== 'spectate') return showToast('请先选择梦角');
  var input = document.getElementById('gomokuChatInput');
  var text = input.value.trim();
  if (!text) return;
  
  addGomokuChat('user', text);
  input.value = '';
  
  setTimeout(function() {
    var reply = '嗯嗯，专心下棋吧~'; 
    var replySenderId = null;
    var targetDreamId = null;

    if (gomoku.mode === 'spectate') {
      var match = state.gomokuAiMatches.find(m => m.id === gomoku.spectateMatchId);
      if (match) {
        // 观战模式：随机 P1 或 P2 回复
        if (Math.random() < 0.5) {
            targetDreamId = match.p1Id;
            replySenderId = match.p1Id;
        } else {
            targetDreamId = match.p2Id;
            replySenderId = match.p2Id;
        }
      }
    } else {
      targetDreamId = gomoku.dreamId;
    }

    if (!targetDreamId) return;
    
    var usableCards = getUsableCards(targetDreamId);
    if (usableCards.length > 0) {
      reply = usableCards[Math.floor(Math.random() * usableCards.length)].text;
    } else {
      var gameReplies = ['该你啦！', '别发呆哦', '这局我要赢', '哎呀，好险', '嘿嘿，看招！', '你觉得谁会赢？'];
      reply = gameReplies[Math.floor(Math.random() * gameReplies.length)];
    }
    
    addGomokuChat('dream', reply, replySenderId);
  }, 1000 + Math.random() * 1500);
}

// 打开/关闭下拉框
function toggleGomokuDreamPicker(e) {
  if (e) e.stopPropagation();
  if (gomoku.active) return showToast('对局中不能换人哦');
  if (!state.dreams || state.dreams.length === 0) return showToast('还没有梦角');

  var dd = document.getElementById('gomokuDreamDropdown');
  var list = document.getElementById('gomokuDreamDropdownList');
  
    if (dd.style.display === 'none' || dd.style.display === '') {
    list.innerHTML = state.dreams.map(function(d) {
      var isActive = d.id === gomoku.dreamId;
      // 默认头像兜底
      var avatarSrc = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2736%27 height=%2736%27 viewBox=%270 0 36 36%27%3E%3Ccircle cx=%2718%27 cy=%2718%27 r=%2718%27 fill=%27%23dff0ff%27/%3E%3Ctext x=%2718%27 y=%2723%27 text-anchor=%27middle%27 fill=%27%23007aff%27 font-size=%2714%27%3E💜%3C/text%3E%3C/svg%3E';
      
      return `<div onclick="selectGomokuDream('${d.id}', event)" style="display:flex; align-items:center; padding:12px; border-bottom:1px solid var(--border); cursor:pointer; ${isActive ? 'background:var(--bg);' : ''}">
        <img src="${avatarSrc}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; margin-right:10px; flex-shrink:0;">
        <div style="flex:1; min-width:0; display:flex; flex-direction:column;">
          <div style="font-size:14px; font-weight:600; color:var(--text); text-align:left;">${d.name}</div>
          <div style="font-size:11px; color:var(--gray); margin-top:2px; text-align:left;">${d.currentStatus || '在线'}</div>
        </div>
        ${isActive ? '<span style="color:var(--blue);font-size:14px;">✓</span>' : ''}
      </div>`;
    }).join('');
    dd.style.display = 'block';
  }
}

// 选中某个梦角
function selectGomokuDream(id, e) {
  if (e) e.stopPropagation();
  gomoku.dreamId = id;
  document.getElementById('gomokuDreamDropdown').style.display = 'none';
  resetGomokuGame(); // 换了人，重新初始化棋盘
}

// 全局点击关闭下拉框
document.addEventListener('click', function(e) {
  var dd = document.getElementById('gomokuDreamDropdown');
  var sel = document.getElementById('gomokuDreamSelector');
  if (dd && dd.style.display === 'block' && sel && !sel.contains(e.target) && !dd.contains(e.target)) {
    dd.style.display = 'none';
  }
});

// ==========================================
// ===== 五子棋历史记录 =====
// ==========================================
var gomokuHistoryEditMode = false;
var gomokuHistorySelected = [];

function openGomokuHistory() {
  gomokuHistoryEditMode = false;
  gomokuHistorySelected = [];
  updateGomokuHistoryUI();
  renderGomokuHistoryList();
  navigateTo('pageGomokuHistory');
}

function toggleGomokuHistoryEdit() {
  gomokuHistoryEditMode = !gomokuHistoryEditMode;
  if (!gomokuHistoryEditMode) gomokuHistorySelected = [];
  updateGomokuHistoryUI();
  renderGomokuHistoryList();
}

function updateGomokuHistoryUI() {
  var btn = document.getElementById('gomokuHistoryEditBtn');
  var bar = document.getElementById('gomokuHistoryBottomBar');
  if (btn) btn.textContent = gomokuHistoryEditMode ? '完成' : '编辑';
  if (bar) bar.style.display = gomokuHistoryEditMode ? 'flex' : 'none';
}

function renderGomokuHistoryList() {
  var container = document.getElementById('gomokuHistoryList');
  if (!container) return;
  
  if (!state.gomokuHistory || state.gomokuHistory.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:var(--gray); padding:40px 20px; font-size:14px;">还没有对弈记录哦</div>';
    return;
  }

  // 按结束时间倒序
  var sorted = state.gomokuHistory.slice().sort((a, b) => b.endTime - a.endTime);

  var html = '';
  sorted.forEach(function(r) {
    var isSelected = gomokuHistorySelected.indexOf(r.id) > -1;
    
    var t = new Date(r.startTime);
    var timeStr = (t.getMonth()+1) + '月' + t.getDate() + '日 ' + String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');
    
    // 游戏时长格式化
    var durationStr = '';
    var m = Math.floor(r.duration / 60);
    var s = r.duration % 60;
    if (m > 0) durationStr = m + '分' + s + '秒';
    else durationStr = s + '秒';

    // 胜负文案
    var resultStr = '';
    var resultColor = '';
        if (r.winner === 'ai') { // 梦角对局
      resultStr = r.winnerName + ' 获胜';
      resultColor = '#007aff';
    } else 
    if (r.winner === 'user') {
      resultStr = (r.reason === 'resign' ? '对方认输，你赢了' : '你赢了');
      resultColor = '#34c759'; // 绿色
    } else if (r.winner === 'dream') {
      resultStr = (r.reason === 'resign' ? '你认输了' : r.dreamName + ' 赢了');
      resultColor = '#ff3b30'; // 红色
    } else {
      resultStr = '平局';
      resultColor = '#86868b';
    }

        // 👇 区分是玩家对局还是梦角对局
    var titleStr = r.userColor === 0 ? r.dreamName + ' 的对局' : '和 ' + r.dreamName + ' 的对局';
    var colorInfoStr = '';
    if (r.userColor === 0 && r.p1Name) {
        colorInfoStr = r.p1Name + '执' + (r.p1Color === 1 ? '黑' : '白') + '，' + r.p2Name + '执' + (r.p2Color === 1 ? '黑' : '白');
    } else {
        colorInfoStr = '我执' + (r.userColor === 1 ? '黑' : '白') + '，' + r.dreamName + '执' + (r.userColor === 1 ? '白' : '黑');
    }

    var dreamAv = '';
    if (r.userColor !== 0) {
      dreamAv = r.dreamAvatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%2720%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2720%27 y=%2725%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2716%27%3E💜%3C/text%3E%3C/svg%3E';
    }

    html += `<div onclick="toggleGomokuHistorySelect('${r.id}')" style="display:flex; gap:12px; padding:14px; background:var(--card); border-radius:12px; margin-bottom:10px; border:1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}; transition:all 0.2s;">
      ${gomokuHistoryEditMode ? `<div style="width:22px;height:22px;border-radius:50%;border:2px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}; background:${isSelected ? 'var(--blue)' : 'transparent'}; display:flex;justify-content:center;align-items:center;color:#fff;font-size:12px;flex-shrink:0;margin-top:12px;">${isSelected ? '✓' : ''}</div>` : ''}
      
     ${r.userColor !== 0 ? `<img src="${dreamAv}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;margin-top:4px;">` : ''}
      
      <div style="flex:1; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:14px; font-weight:600; color:var(--text);">${titleStr}</span>
          <span style="font-size:12px; color:${resultColor}; font-weight:600;">${resultStr}</span>
        </div>
        <div style="font-size:12px; color:var(--gray); margin-bottom:4px;">
          🕒 ${timeStr} &nbsp;|&nbsp; ⏱️ 耗时 ${durationStr}
        </div>
        <div style="font-size:11px; color:#999;">
  ${colorInfoStr}
</div>
      </div>
    </div>`;
  });

  container.innerHTML = html;
}

function toggleGomokuHistorySelect(id) {
  if (!gomokuHistoryEditMode) return;
  var idx = gomokuHistorySelected.indexOf(id);
  if (idx > -1) gomokuHistorySelected.splice(idx, 1);
  else gomokuHistorySelected.push(id);
  renderGomokuHistoryList();
}

function gomokuHistorySelectAll() {
  if (!state.gomokuHistory) return;
  if (gomokuHistorySelected.length === state.gomokuHistory.length) {
    gomokuHistorySelected = [];
  } else {
    gomokuHistorySelected = state.gomokuHistory.map(x => x.id);
  }
  renderGomokuHistoryList();
}

function deleteSelectedGomokuHistory() {
  if (gomokuHistorySelected.length === 0) return showToast('请先选择要删除的记录');
  if (!confirm('确定删除选中的 ' + gomokuHistorySelected.length + ' 条记录吗？')) return;
  
  state.gomokuHistory = state.gomokuHistory.filter(x => gomokuHistorySelected.indexOf(x.id) === -1);
  gomokuHistorySelected = [];
  gomokuHistoryEditMode = false;
  updateGomokuHistoryUI();
  saveState();
  renderGomokuHistoryList();
  showToast('已删除');
}

// ==========================================
// ===== 梦角对弈后台引擎 =====
// ==========================================

// 全局变量，记录用户当前选中的梦角ID
window._spectateSelectedIds = [];

function startSpectateMatch() {
  if (!state.dreams || state.dreams.length < 2) return showToast('至少需要两个梦角');

  // 检查是否有正在进行的比赛
  var activeMatch = state.gomokuAiMatches && state.gomokuAiMatches.find(m => m.active);
  if (activeMatch) {
    if (confirm('当前有正在进行的梦角对局，是否直接进入观战？')) {
      enterSpectateMode(activeMatch.id);
      return;
    }
  }

  // 重置选中状态
  window._spectateSelectedIds = [];
  renderSpectateDreamPicker();
  
  // 显示弹窗
  document.getElementById('spectateDreamPickerModal').style.display = 'flex';
}

function renderSpectateDreamPicker() {
  var list = document.getElementById('spectateDreamPickerList');
  var btn = document.getElementById('spectateStartBtn');
  if (!list || !btn) return;

  list.innerHTML = state.dreams.map(function(d) {
    var isSelected = window._spectateSelectedIds.indexOf(d.id) > -1;
    var avatarSrc = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2736%27 height=%2736%27 viewBox=%270 0 36 36%27%3E%3Ccircle cx=%2718%27 cy=%2718%27 r=%2718%27 fill=%27%23dff0ff%27/%3E%3Ctext x=%2718%27 y=%2723%27 text-anchor=%27middle%27 fill=%27%23007aff%27 font-size=%2714%27%3E💜%3C/text%3E%3C/svg%3E';
    
    return `<div onclick="toggleSpectateDream('${d.id}')" style="display:flex; align-items:center; padding:12px; border-radius:12px; border:1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}; background:${isSelected ? 'rgba(0,122,255,0.05)' : 'transparent'}; cursor:pointer; transition:all 0.2s;">
      <img src="${avatarSrc}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; margin-right:12px;">
      <span style="flex:1; font-size:15px; font-weight:${isSelected ? '600' : '400'}; color:var(--text);">${d.name}</span>
      <div style="width:20px; height:20px; border-radius:50%; border:2px solid ${isSelected ? 'var(--blue)' : '#ccc'}; display:flex; justify-content:center; align-items:center; background:${isSelected ? 'var(--blue)' : 'transparent'};">
        ${isSelected ? '<span style="color:#fff; font-size:12px;">✓</span>' : ''}
      </div>
    </div>`;
  }).join('');

  // 更新按钮状态
  if (window._spectateSelectedIds.length === 2) {
    btn.disabled = false;
    btn.style.opacity = '1';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.5';
  }
}

function toggleSpectateDream(id) {
  var idx = window._spectateSelectedIds.indexOf(id);
  if (idx > -1) {
    window._spectateSelectedIds.splice(idx, 1);
  } else {
    if (window._spectateSelectedIds.length >= 2) {
      // 如果已经选了两个，把最早选的踢出去
      window._spectateSelectedIds.shift();
    }
    window._spectateSelectedIds.push(id);
  }
  renderSpectateDreamPicker();
}

function closeSpectateDreamPicker() {
  document.getElementById('spectateDreamPickerModal').style.display = 'none';
}

function confirmSpectateMatch() {
  if (window._spectateSelectedIds.length !== 2) return;
  
  var d1 = state.dreams.find(x => x.id === window._spectateSelectedIds[0]);
  var d2 = state.dreams.find(x => x.id === window._spectateSelectedIds[1]);

  if (!d1 || !d2) return showToast('梦角不存在');
  if (d1.id === d2.id) return showToast('不能选择同一个人');

  // 检查是否有人在其他对局中
  var isBusy = state.gomokuAiMatches && state.gomokuAiMatches.some(m => m.active && (m.p1Id === d1.id || m.p2Id === d1.id || m.p1Id === d2.id || m.p2Id === d2.id));
  if (isBusy) return showToast('其中一名梦角正在其他对局中');

  closeSpectateDreamPicker();
  createGomokuAiMatch(d1, d2, null);
}

function createGomokuAiMatch(d1, d2, triggerChatId) {
  if (!state.gomokuAiMatches) state.gomokuAiMatches = [];
  var matchId = 'aimatch_' + Date.now();
  var match = {
    id: matchId, p1Id: d1.id, p1Name: d1.name, p1Color: Math.random() < 0.5 ? 1 : 2,
    p2Id: d2.id, p2Name: d2.name, p2Color: 0,
    board: Array(15).fill(0).map(() => Array(15).fill(0)),
    moves: [], active: true, startTime: Date.now(),
    triggerChatId: triggerChatId, turnColor: 1,
    p1UndoLeft: 3, p2UndoLeft: 3 // 👈 新增悔棋次数
  };
  match.p2Color = match.p1Color === 1 ? 2 : 1;
  state.gomokuAiMatches.push(match); saveState();
  if (!triggerChatId) enterSpectateMode(matchId);
  else sendGomokuInviteCard(match, d1);
  runAiMatchEngine(matchId);
}

function runAiMatchEngine(matchId) {
  var match = state.gomokuAiMatches.find(m => m.id === matchId);
  if (!match || !match.active) return;
  
  setTimeout(function() {
    var matchNow = state.gomokuAiMatches.find(m => m.id === matchId);
    if (!matchNow || !matchNow.active) return;

    var color = matchNow.turnColor;
    var enemyColor = color === 1 ? 2 : 1;
    var isP1 = color === matchNow.p1Color;
    var currentName = isP1 ? matchNow.p1Name : matchNow.p2Name;

    // 认输 (下满20步后，0.1%概率)
    if (matchNow.moves.length > 20 && Math.random() < 0.001) {
      var winnerId = isP1 ? matchNow.p2Id : matchNow.p1Id;
      addGomokuChat('system', `「${currentName}」认输了！`);
      endGomokuAiMatch(matchNow, winnerId);
      return;
    }

    // 悔棋 (3%概率)
    var undoLeft = isP1 ? (matchNow.p1UndoLeft !== undefined ? matchNow.p1UndoLeft : 3) : (matchNow.p2UndoLeft !== undefined ? matchNow.p2UndoLeft : 3);
    if (matchNow.moves.length >= 3 && undoLeft > 0 && Math.random() < 0.03) {
        var lastMove1 = matchNow.moves.pop();
        matchNow.board[lastMove1.y][lastMove1.x] = 0;
        var lastMove2 = matchNow.moves.pop();
        matchNow.board[lastMove2.y][lastMove2.x] = 0;
        
        if (isP1) matchNow.p1UndoLeft = undoLeft - 1;
        else matchNow.p2UndoLeft = undoLeft - 1;
        
        addGomokuChat('dream', `哎呀，下错了，我悔个棋~`, isP1 ? matchNow.p1Id : matchNow.p2Id);
        
        // 👇 核心修改：记录禁手
        matchNow.forbiddenMove = { x: lastMove1.x, y: lastMove1.y };
        
        saveState();
        if (gomoku.mode === 'spectate' && gomoku.spectateMatchId === matchId) {
            gomoku.board = matchNow.board; 
            updateGomokuUI(); drawGomokuBoard();
        }
        setTimeout(() => runAiMatchEngine(matchId), 1000);
        return;
    }

    if (matchNow.moves.length === 0) {
      matchNow.board[7][7] = color;
      matchNow.moves.push({x: 7, y: 7, color: color});
      matchNow.turnColor = enemyColor;
      saveState();
      if (gomoku.mode === 'spectate' && gomoku.spectateMatchId === matchId) {
        gomoku.board = matchNow.board; gomoku.currentTurn = matchNow.turnColor;
        updateGomokuUI(); drawGomokuBoard();
      }
      runAiMatchEngine(matchId);
      return;
    }

    var maxMyScore = -1, maxEnemyScore = -1;
    var bestMyMoves = [], bestEnemyMoves = [];

    for (var y = 0; y < 15; y++) {
      for (var x = 0; x < 15; x++) {
        if (matchNow.board[y][x] !== 0) continue;
        
        // 👇 核心修改：如果刚悔棋，跳过那个位置
        if (matchNow.forbiddenMove && x === matchNow.forbiddenMove.x && y === matchNow.forbiddenMove.y) {
            continue;
        }

        var hasNearbyPiece = false;
        for (var dy = -2; dy <= 2; dy++) {
          for (var dx = -2; dx <= 2; dx++) {
            var ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < 15 && nx >= 0 && nx < 15 && matchNow.board[ny][nx] !== 0) { hasNearbyPiece = true; break; }
          }
          if (hasNearbyPiece) break;
        }
        if (!hasNearbyPiece) continue;

        var oldBoard = gomoku.board;
        gomoku.board = matchNow.board;
        
        var myScore = evaluateGomokuPoint(x, y, color);
        var enemyScore = evaluateGomokuPoint(x, y, enemyColor);
        
        gomoku.board = oldBoard;

        if (myScore > maxMyScore) { maxMyScore = myScore; bestMyMoves = [{x, y}]; }
        else if (myScore === maxMyScore) bestMyMoves.push({x, y});

        if (enemyScore > maxEnemyScore) { maxEnemyScore = enemyScore; bestEnemyMoves = [{x, y}]; }
        else if (enemyScore === maxEnemyScore) bestEnemyMoves.push({x, y});
      }
    }

    var move = null;
    if (maxMyScore >= 10000000) move = bestMyMoves[Math.floor(Math.random() * bestMyMoves.length)];
    else if (maxEnemyScore >= 10000000) move = bestEnemyMoves[Math.floor(Math.random() * bestEnemyMoves.length)];
    else if (maxMyScore >= 1000000) move = bestMyMoves[Math.floor(Math.random() * bestMyMoves.length)];
    else if (maxEnemyScore >= 1000000) move = bestEnemyMoves[Math.floor(Math.random() * bestEnemyMoves.length)];
    else {
      var bestScore = -1;
      var bestMoves = [];
      for (var y = 0; y < 15; y++) {
        for (var x = 0; x < 15; x++) {
          if (matchNow.board[y][x] === 0) {
            if (matchNow.forbiddenMove && x === matchNow.forbiddenMove.x && y === matchNow.forbiddenMove.y) continue;
            var oldB = gomoku.board; gomoku.board = matchNow.board;
            var score = evaluateGomokuPoint(x, y, color) + evaluateGomokuPoint(x, y, enemyColor) * 0.9;
            gomoku.board = oldB;
            
            score += Math.random() * 0.1;
            if (score > bestScore) { bestScore = score; bestMoves = [{x, y}]; }
            else if (score === bestScore) bestMoves.push({x, y});
          }
        }
      }
      if (bestMoves.length > 0) move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      else { matchNow.forbiddenMove = null; runAiMatchEngine(matchId); return; } // 兜底
    }

        if (move) {
      matchNow.board[move.y][move.x] = color;
      matchNow.moves.push({x: move.x, y: move.y, color: color});
      
      // 👇 【核心修复】：不管输赢，先把最后一步棋画到观战者的屏幕上！
      if (gomoku.mode === 'spectate' && gomoku.spectateMatchId === matchId) {
        gomoku.board = matchNow.board; 
        gomoku.currentTurn = matchNow.turnColor;
        drawGomokuBoard(); 
      }

      // 然后再判断输赢
      if (checkGomokuWinBoard(matchNow.board, move.x, move.y, color)) { 
        endGomokuAiMatch(matchNow, color === matchNow.p1Color ? matchNow.p1Id : matchNow.p2Id); 
        return; 
      }
      if (matchNow.moves.length >= 225) { endGomokuAiMatch(matchNow, 'draw'); return; }
      
      matchNow.turnColor = enemyColor;
      saveState();

      if (gomoku.mode === 'spectate' && gomoku.spectateMatchId === matchId) {
        updateGomokuUI();
      }
      runAiMatchEngine(matchId);
    }
  }, 1000 + Math.random() * 1000);
}

function endGomokuAiMatch(match, winnerId) {
  match.active = false; match.endTime = Date.now(); match.winner = winnerId;
  match.duration = Math.floor((match.endTime - match.startTime) / 1000);
  saveState();
  var winnerName = winnerId === 'draw' ? '平局' : (winnerId === match.p1Id ? match.p1Name : match.p2Name);
  
  if (!state.gomokuHistory) state.gomokuHistory = [];
  state.gomokuHistory.push({
    id: match.id, startTime: match.startTime, endTime: match.endTime, duration: match.duration,
    dreamName: match.p1Name + ' vs ' + match.p2Name, dreamAvatar: '',
    userColor: 0, winner: winnerId === 'draw' ? 'draw' : 'ai', winnerName: winnerName,
    reason: 'five', boardSnapshot: generateBoardSnapshot(match.board),
    p1Name: match.p1Name, p2Name: match.p2Name, p1Color: match.p1Color, p2Color: match.p2Color
  });
  saveState();
  
  // 👇 更新观战结束状态
  if (gomoku.mode === 'spectate' && gomoku.spectateMatchId === match.id) {
    gomoku.board = match.board; // 确保数据一致
    drawGomokuBoard(); // 确保最后画面渲染
    updateGomokuUI(); 
    showToast('对局结束：' + winnerName + ' 获胜');
  }
  
  if (match.triggerChatId) sendGomokuResultCard(match);
}

function generateBoardSnapshot(board) {
  var canvas = document.createElement('canvas'); canvas.width = 150; canvas.height = 150;
  var ctx = canvas.getContext('2d'); ctx.fillStyle = '#e6c280'; ctx.fillRect(0,0,150,150);
  var pad = 10; var cs = (150 - pad*2) / 14;
  ctx.strokeStyle = '#8b6b40'; ctx.lineWidth = 1;
  for(var i=0; i<15; i++){
    ctx.beginPath(); ctx.moveTo(pad, pad + i*cs); ctx.lineTo(pad + 14*cs, pad + i*cs); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad + i*cs, pad); ctx.lineTo(pad + i*cs, pad + 14*cs); ctx.stroke();
  }
  for(var y=0; y<15; y++) for(var x=0; x<15; x++) if(board[y][x] !== 0){
    ctx.beginPath(); ctx.arc(pad + x*cs, pad + y*cs, cs*0.4, 0, Math.PI*2);
    ctx.fillStyle = board[y][x] === 1 ? '#333' : '#fff'; ctx.fill();
    if(board[y][x] === 2){ ctx.strokeStyle = '#ccc'; ctx.stroke(); }
  }
  return canvas.toDataURL('image/png');
}

function checkGomokuWinBoard(board, x, y, color) {
  var dirs = [[1,0], [0,1], [1,1], [1,-1]];
  for (var i = 0; i < 4; i++) {
    var count = 1;
    for (var j = 1; j < 5; j++) {
      var nx = x + dirs[i][0] * j, ny = y + dirs[i][1] * j;
      if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && board[ny][nx] === color) count++; else break;
    }
    for (var j = 1; j < 5; j++) {
      var nx = x - dirs[i][0] * j, ny = y - dirs[i][1] * j;
      if (nx >= 0 && nx < 15 && ny >= 0 && ny < 15 && board[ny][nx] === color) count++; else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

function enterSpectateMode(matchId) {
  var match = state.gomokuAiMatches.find(m => m.id === matchId);
  if (!match) return showToast('对局已结束或不存在');
  gomoku.mode = 'spectate'; gomoku.spectateMatchId = matchId;
  gomoku.board = match.board; gomoku.currentTurn = match.turnColor;
  navigateTo('pageGomoku'); updateGomokuUI();
  setTimeout(drawGomokuBoard, 50); renderGomokuChats();
}

function sendGomokuInviteCard(match, initiatorDream) {
  if (!state.chatSessions[match.triggerChatId]) state.chatSessions[match.triggerChatId] = [];
  state.chatSessions[match.triggerChatId].push({
    from: 'dream', senderId: initiatorDream.id, senderName: initiatorDream.name,
    type: 'gomoku_invite', matchId: match.id, p1Name: match.p1Name, p2Name: match.p2Name, time: Date.now()
  });
  saveState();
  if (state.currentChatId === match.triggerChatId) { loadChatMessages(); renderChatMessages(); }
   try { renderChatList(); updateAppIconBadges(); } catch(e) {}
}

function sendGomokuResultCard(match) {
  if (!state.chatSessions[match.triggerChatId]) return;
  var winnerName = match.winner === 'draw' ? '平局' : (match.winner === match.p1Id ? match.p1Name : match.p2Name);
  state.chatSessions[match.triggerChatId].push({
    from: 'dream', senderId: match.p1Id, senderName: match.p1Name,
    type: 'gomoku_result', matchId: match.id, p1Name: match.p1Name, p2Name: match.p2Name,
    p1Color: match.p1Color, p2Color: match.p2Color, // 👈 新增，存下双方颜色
    winnerName: winnerName, duration: match.duration, boardSnapshot: generateBoardSnapshot(match.board), time: Date.now()
  });
  saveState();
  if (state.currentChatId === match.triggerChatId) { loadChatMessages(); renderChatMessages(); }
  try { renderChatList(); updateAppIconBadges(); } catch(e) {}
}

// 1%概率梦角互相发起对局
setInterval(function() {
  if (!state.dreams || state.dreams.length < 2) return;
  if (state.gomokuAiMatches && state.gomokuAiMatches.some(m => m.active)) return;
  if (Math.random() > 0.01) return; 
  var d1 = state.dreams[Math.floor(Math.random() * state.dreams.length)];
  var d2 = state.dreams.filter(d => d.id !== d1.id)[Math.floor(Math.random() * (state.dreams.length - 1))];
  createGomokuAiMatch(d1, d2, d1.id); 
}, 60000);

// ==========================================
// 恢复中断的 AI 对局 (加在 init 函数的最末尾)
// ==========================================
// 按 Ctrl+F 搜索 function init() { ，在这个函数的最后加：
/*
  if (state.gomokuAiMatches) {
    state.gomokuAiMatches.forEach(m => {
      if (m.active) {
        m.turnColor = m.moves.length % 2 === 0 ? 1 : 2;
        runAiMatchEngine(m.id);
      }
    });
  }
*/

// ==========================================
// ===== 井字棋系统 核心逻辑 =====
// ==========================================
let ticTacToe = {
  board: Array(9).fill(0), // 0空 1黑叉 2白圈
  active: false,       
  dreamId: null,       
  userColor: 1,        
  aiColor: 2,          
  currentTurn: 1,      
  isUserTurn: true,    
  userUndoLeft: 3,     
  aiUndoLeft: 3,       
  moveHistory: [],     
  chats: [],           
  mode: 'pvp',         
  spectateMatchId: null,
  forbiddenMove: null  
};

// --- 用户对战部分 ---
function openTicTacToeGame() {
  navigateTo('pageTicTacToe');
  resetTicTacToe();
}

function resetTicTacToe() {
  ticTacToe.active = false;
  ticTacToe.board = Array(9).fill(0);
  ticTacToe.moveHistory = [];
  ticTacToe.chats = [];
  ticTacToe.userUndoLeft = 3;
  ticTacToe.aiUndoLeft = 3;
  ticTacToe.mode = 'pvp';
  ticTacToe.spectateMatchId = null;
  ticTacToe.forbiddenMove = null;
  
  if (Math.random() < 0.5) { ticTacToe.userColor = 1; ticTacToe.aiColor = 2; }
  else { ticTacToe.userColor = 2; ticTacToe.aiColor = 1; }

  if (!ticTacToe.dreamId && state.dreams && state.dreams.length > 0) {
    ticTacToe.dreamId = state.dreams[0].id;
  }
  
  updateTTTUI();
  drawTTTBoard();
  renderTTTChats();
}

function exitTicTacToe() {
  ticTacToe.chats = [];
  ticTacToe.active = false;
  ticTacToe.mode = 'pvp';
  ticTacToe.spectateMatchId = null;
  navigateTo('pageGame');
}

function startTicTacToeMatch() {
  if (!ticTacToe.dreamId) return showToast('请选择梦角');
  
  if (state.tttAiMatches && state.tttAiMatches.some(m => m.active && (m.p1Id === ticTacToe.dreamId || m.p2Id === ticTacToe.dreamId))) {
    return showToast('该梦角正在与其他梦角对弈中，请稍后再试');
  }

  ticTacToe.board = Array(9).fill(0);
  ticTacToe.moveHistory = [];
  ticTacToe.userUndoLeft = 3;
  ticTacToe.aiUndoLeft = 3;
  ticTacToe.forbiddenMove = null;
  
  if (Math.random() < 0.5) { ticTacToe.userColor = 1; ticTacToe.aiColor = 2; }
  else { ticTacToe.userColor = 2; ticTacToe.aiColor = 1; }

  ticTacToe.active = true;
  ticTacToe.currentTurn = 1;
  ticTacToe.isUserTurn = (ticTacToe.userColor === 1);
  ticTacToe.startTime = Date.now();
  
  updateTTTUI();
  drawTTTBoard();
  addTTTChat('system', `游戏开始！你执${ticTacToe.userColor === 1 ? '叉' : '圈'}，${getDreamName(ticTacToe.dreamId)}执${ticTacToe.aiColor === 1 ? '叉' : '圈'}。`);
  
  if (!ticTacToe.isUserTurn) setTimeout(aiTicTacToeMove, 800);
}

function handleTTTClick(idx) {
  if (!ticTacToe.active || !ticTacToe.isUserTurn) return;
  if (ticTacToe.board[idx] !== 0) return;
  makeTTTMove(idx, ticTacToe.userColor);
}

function drawTTTBoard() {
  var wrapper = document.getElementById('tttBoardWrapper');
  if (!wrapper) return;
  
  for (var i = 0; i < 9; i++) {
    var cell = wrapper.querySelector(`.ttt-cell[data-idx="${i}"]`);
    if (!cell) continue;
    
    if (ticTacToe.board[i] === 1) {
      cell.innerHTML = '<div class="ttt-x"><svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></div>';
    } else if (ticTacToe.board[i] === 2) {
      cell.innerHTML = '<div class="ttt-o"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg></div>';
    } else {
      cell.innerHTML = '';
    }
  }
}

function updateTTTUI() {
  var turnEl = document.getElementById('tttTurnIndicator');
  var overlay = document.getElementById('tttStartOverlay');
  var selector = document.getElementById('tttDreamSelector');

  if (ticTacToe.mode === 'spectate') {
    if (overlay) overlay.style.display = 'none';
    if (selector) selector.style.display = 'none'; 
    
    var match = state.tttAiMatches.find(m => m.id === ticTacToe.spectateMatchId);
    if (match) {
      var p1ColStr = match.p1Color === 1 ? '叉' : '圈';
      var p2ColStr = match.p2Color === 1 ? '叉' : '圈';
      document.getElementById('tttDreamAvatar').src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%2720%27 fill=%27%23eee%27/%3E%3C/svg%3E';
      document.getElementById('tttDreamName').textContent = match.p1Name + '(' + p1ColStr + ') vs ' + match.p2Name + '(' + p2ColStr + ')';
      document.getElementById('tttDreamStatus').textContent = '对局观战中';
      
      document.getElementById('tttUserColor').innerHTML = `${match.p1Name}：${match.p1Color === 1 ? '黑叉' : '白圈'} &nbsp; | &nbsp; ${match.p2Name}：${match.p2Color === 1 ? '黑叉' : '白圈'}`;
      
      if (match.active) {
        var currentPlayerName = ticTacToe.currentTurn === 1 ? (match.p1Color === 1 ? match.p1Name : match.p2Name) : (match.p2Color === 1 ? match.p2Name : match.p1Name);
        turnEl.textContent = currentPlayerName + ' 思考中...';
        turnEl.style.color = '#ff9500';
        turnEl.style.background = 'rgba(255,149,0,0.1)';
      } else {
        turnEl.textContent = '对局已结束';
        turnEl.style.color = '#86868b';
        turnEl.style.background = '#f0f0f5';
      }
    }
    return; 
  }

  if (selector) selector.style.display = 'flex'; 
  if (!ticTacToe.dreamId) return;
  var d = state.dreams.find(x => x.id === ticTacToe.dreamId);
  if (!d) return;

  document.getElementById('tttDreamAvatar').src = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%2720%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2720%27 y=%2725%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2716%27%3E💜%3C/text%3E%3C/svg%3E';
  document.getElementById('tttDreamName').textContent = d.name;
  document.getElementById('tttDreamStatus').textContent = d.currentStatus || '在线';
  
  var userColStr = ticTacToe.userColor === 1 ? '黑叉' : '白圈';
  var aiColStr = ticTacToe.aiColor === 1 ? '黑叉' : '白圈';
  document.getElementById('tttUserColor').innerHTML = `我：${userColStr} &nbsp; | &nbsp; ${d.name}：${aiColStr}`;

  if (overlay) {
    overlay.style.display = ticTacToe.active ? 'none' : 'flex';
    var startBtn = document.getElementById('tttStartBtn');
    if (startBtn) startBtn.textContent = ticTacToe.moveHistory.length > 0 ? '再来一局' : '开始游戏';
  }

  if (!ticTacToe.active) {
    turnEl.textContent = ticTacToe.moveHistory.length === 0 ? '未开始' : '游戏结束';
    turnEl.style.color = '#86868b';
    turnEl.style.background = '#f0f0f5';
  } else {
    if (ticTacToe.isUserTurn) {
      turnEl.textContent = '你的回合';
      turnEl.style.color = 'var(--blue)';
      turnEl.style.background = 'rgba(0,122,255,0.1)';
    } else {
      turnEl.textContent = d.name + ' 思考中...';
      turnEl.style.color = '#ff9500';
      turnEl.style.background = 'rgba(255,149,0,0.1)';
    }
  }
}

function makeTTTMove(index, color) {
  ticTacToe.board[index] = color;
  ticTacToe.moveHistory.push({ index: index, color: color });
  drawTTTBoard();

  var winner = checkTTTWin(ticTacToe.board, color);
  if (winner) {
    ticTacToe.active = false;
    updateTTTUI();
    if (color === ticTacToe.userColor) {
      addTTTChat('system', '你赢了！');
      showToast('你赢了！');
      saveTTTHistory('user', 'line');
    } else {
      addTTTChat('system', `${getDreamName(ticTacToe.dreamId)} 赢了！`);
      showToast('你输了');
      saveTTTHistory('dream', 'line');
    }
    return;
  }

  if (ticTacToe.moveHistory.length >= 9) {
    ticTacToe.active = false;
    updateTTTUI();
    addTTTChat('system', '平局！棋盘满了。');
    saveTTTHistory('draw', 'full');
    return;
  }

  ticTacToe.currentTurn = color === 1 ? 2 : 1;
  ticTacToe.isUserTurn = (ticTacToe.currentTurn === ticTacToe.userColor);
  updateTTTUI();

  if (!ticTacToe.isUserTurn && ticTacToe.active) {
    setTimeout(aiTicTacToeMove, 800 + Math.random() * 500);
  }
}

function checkTTTWin(board, color) {
  var lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (var i = 0; i < lines.length; i++) {
    var [a,b,c] = lines[i];
    if (board[a] === color && board[b] === color && board[c] === color) return true;
  }
  return false;
}

function userUndoTicTacToe() {
  if (!ticTacToe.active) return showToast('游戏未开始');
  if (ticTacToe.userUndoLeft <= 0) return showToast('悔棋次数用完了');
  if (ticTacToe.moveHistory.length < 2) return showToast('还没下几步呢');

  var lastMove1 = ticTacToe.moveHistory.pop();
  ticTacToe.board[lastMove1.index] = 0;
  var lastMove2 = ticTacToe.moveHistory.pop();
  ticTacToe.board[lastMove2.index] = 0;

  ticTacToe.userUndoLeft--;
  ticTacToe.isUserTurn = true; 
  ticTacToe.currentTurn = ticTacToe.userColor;
  
  updateTTTUI();
  drawTTTBoard();
  showToast('悔棋成功');
}

function userResignTicTacToe() {
  if (!ticTacToe.active) return;
  if (!confirm('确定要认输吗？')) return;
  ticTacToe.active = false;
  updateTTTUI();
  addTTTChat('system', `你认输了，${getDreamName(ticTacToe.dreamId)} 获得胜利。`);
  saveTTTHistory('dream', 'resign');
}

function aiTicTacToeMove() {
  if (!ticTacToe.active || ticTacToe.isUserTurn) return;

  var move = getBestTTTMove(ticTacToe.board, ticTacToe.aiColor, ticTacToe.userColor, null);
  
  if (move !== -1) {
    makeTTTMove(move, ticTacToe.aiColor);
  }
}

function getBestTTTMove(board, aiColor, userColor, forbiddenIndex) {
  var empty = [];
  for (var i = 0; i < 9; i++) if (board[i] === 0) empty.push(i);
  if (empty.length === 0) return -1;

  // 15% 概率失误随机走，避免不可战胜
  if (Math.random() < 0.15 && forbiddenIndex === null) {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // 1. 自己能赢吗？
  for (var i = 0; i < empty.length; i++) {
    if (i === forbiddenIndex) continue;
    board[empty[i]] = aiColor;
    if (checkTTTWin(board, aiColor)) { board[empty[i]] = 0; return empty[i]; }
    board[empty[i]] = 0;
  }

  // 2. 对方能赢吗？(必堵)
  for (var i = 0; i < empty.length; i++) {
    if (i === forbiddenIndex) continue;
    board[empty[i]] = userColor;
    if (checkTTTWin(board, userColor)) { board[empty[i]] = 0; return empty[i]; }
    board[empty[i]] = 0;
  }

  // 3. 占中心
  if (board[4] === 0 && 4 !== forbiddenIndex) return 4;

  // 4. 占空角
  var corners = [0, 2, 6, 8];
  for (var i = 0; i < corners.length; i++) {
    if (board[corners[i]] === 0 && corners[i] !== forbiddenIndex) return corners[i];
  }

  // 5. 占空边
  var edges = [1, 3, 5, 7];
  for (var i = 0; i < edges.length; i++) {
    if (board[edges[i]] === 0 && edges[i] !== forbiddenIndex) return edges[i];
  }

  return empty[Math.floor(Math.random() * empty.length)];
}

// --- 聊天部分 ---
function addTTTChat(sender, text, senderId) {
  ticTacToe.chats.push({sender, text, senderId});
  renderTTTChats();
}

function renderTTTChats() {
  var list = document.getElementById('tttChatList');
  if (!list) return;
  
  if (ticTacToe.chats.length === 0) {
    list.innerHTML = '<div style="text-align:center;font-size:12px;color:#bbb;margin-top:20px;">这里可以聊天，退出后自动清空</div>';
    return;
  }

  var userAvatar = state.profile.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2716%27 fill=%27%23e8e8ed%27/%3E%3Ctext x=%2716%27 y=%2720%27 text-anchor=%27middle%27 fill=%27%2386868b%27 font-size=%2712%27%3E👤%3C/text%3E%3C/svg%3E';
  var defaultDreamAv = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2716%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2716%27 y=%2720%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2712%27%3E💜%3C/text%3E%3C/svg%3E';

  var currentStyle = (typeof chatSettings !== 'undefined' && chatSettings.bubbleStyle) ? chatSettings.bubbleStyle : 'default';
  var styleClass = 'bubble-' + currentStyle;
  var useInlineStyle = (currentStyle === 'default');

  var cs = { bubbleUser: null, bubbleDream: null, fontColor: null };
  if (state.settings && state.settings.chatSettingsMap && state.settings.chatSettingsMap[ticTacToe.dreamId]) {
    cs = state.settings.chatSettingsMap[ticTacToe.dreamId];
  }
  var finalUser = cs.bubbleUser || (state.settings && state.settings.globalBubbleUser) || '#e8e8ed';
  var finalDream = cs.bubbleDream || (state.settings && state.settings.globalBubbleDream) || '#e8e8ed';
  var finalFont = cs.fontColor || (state.settings && state.settings.globalFontColor) || '#1d1d1f';
  var userBg = useInlineStyle ? 'background:' + finalUser + ';' : '';
  var dreamBg = useInlineStyle ? 'background:' + finalDream + ';' : '';
  var textColor = 'color:' + finalFont + ';';

  var specificCSS = (state.chatCustomStyles && state.chatCustomStyles[ticTacToe.dreamId]) ? state.chatCustomStyles[ticTacToe.dreamId] : '';
  var globalCSS = (state.settings && state.settings.globalChatCSS) ? state.settings.globalChatCSS : '';
  var styleEl = document.getElementById('ttt-custom-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'ttt-custom-style';
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = specificCSS || globalCSS;

  list.innerHTML = ticTacToe.chats.map(function(c) {
    if (c.sender === 'system') return `<div style="text-align:center;font-size:11px;color:#999;margin:4px 0;">${c.text}</div>`;
    
    var isUser = c.sender === 'user';
    var bubbleClass = 'chat-bubble ' + (isUser ? 'bubble-user' : 'bubble-dream') + ' ' + styleClass;
    var bgStyle = isUser ? userBg : dreamBg;

    var avatar = userAvatar;
    if (!isUser) {
      if (ticTacToe.mode === 'spectate' && c.senderId) {
        var sd = state.dreams.find(x => x.id === c.senderId);
        avatar = sd && sd.avatar ? sd.avatar : defaultDreamAv;
      } else {
        var d = state.dreams.find(x => x.id === ticTacToe.dreamId);
        avatar = d && d.avatar ? d.avatar : defaultDreamAv;
      }
    }

    var html = `<div style="display:flex; justify-content:${isUser ? 'flex-end' : 'flex-start'}; align-items:flex-start; gap:8px; margin-bottom:8px;">`;
    if (!isUser) html += `<img src="${avatar}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
    html += `<div style="max-width:70%; display:flex; flex-direction:column; align-items:${isUser ? 'flex-end' : 'flex-start'};"><div class="${bubbleClass}" style="${bgStyle} ${textColor}">${escapeHtml(c.text)}</div></div>`;
    if (isUser) html += `<img src="${avatar}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
    html += `</div>`;
    return html;
  }).join('');
  list.scrollTop = list.scrollHeight;
}

function sendTicTacToeChat() {
  if (!ticTacToe.dreamId && ticTacToe.mode !== 'spectate') return showToast('请先选择梦角');
  var input = document.getElementById('tttChatInput');
  var text = input.value.trim();
  if (!text) return;
  
  addTTTChat('user', text);
  input.value = '';
  
  setTimeout(function() {
    var reply = '嗯嗯，专心下棋吧~'; 
    var replySenderId = null;
    var targetDreamId = null;

    if (ticTacToe.mode === 'spectate') {
      var match = state.tttAiMatches.find(m => m.id === ticTacToe.spectateMatchId);
      if (match) {
        if (Math.random() < 0.5) { targetDreamId = match.p1Id; replySenderId = match.p1Id; }
        else { targetDreamId = match.p2Id; replySenderId = match.p2Id; }
      }
    } else {
      targetDreamId = ticTacToe.dreamId;
    }

    if (!targetDreamId) return;
    
    var usableCards = getUsableCards(targetDreamId);
    if (usableCards.length > 0) {
      reply = usableCards[Math.floor(Math.random() * usableCards.length)].text;
    } else {
      var gameReplies = ['该你啦！', '别发呆哦', '这局我要赢', '哎呀，好险', '嘿嘿，看招！'];
      reply = gameReplies[Math.floor(Math.random() * gameReplies.length)];
    }
    addTTTChat('dream', reply, replySenderId);
  }, 1000 + Math.random() * 1500);
}

// --- 梦角选择器 ---
function toggleTicTacToeDreamPicker(e) {
  if (e) e.stopPropagation();
  if (ticTacToe.active) return showToast('对局中不能换人哦');
  if (!state.dreams || state.dreams.length === 0) return showToast('还没有梦角');

  var dd = document.getElementById('tttDreamDropdown');
  var list = document.getElementById('tttDreamDropdownList');
  
  if (dd.style.display === 'none' || dd.style.display === '') {
    list.innerHTML = state.dreams.map(function(d) {
      var isActive = d.id === ticTacToe.dreamId;
      var av = d.avatar ? `background-image:url(${d.avatar});background-size:cover;background-position:center;` : '';
      var avText = d.avatar ? '' : (d.name ? d.name.charAt(0) : '梦');
      return `<div onclick="selectTicTacToeDream('${d.id}', event)" style="display:flex; align-items:center; padding:12px; border-bottom:1px solid var(--border); cursor:pointer; ${isActive ? 'background:var(--bg);' : ''}">
        <div style="${av} width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; margin-right:10px; background:#dff0ff; color:#007aff; flex-shrink:0;">${avText}</div>
        <div style="flex:1; min-width:0; display:flex; flex-direction:column;">
          <div style="font-size:14px; font-weight:600; color:var(--text); text-align:left;">${d.name}</div>
          <div style="font-size:11px; color:var(--gray); margin-top:2px; text-align:left;">${d.currentStatus || '在线'}</div>
        </div>
        ${isActive ? '<span style="color:var(--blue);font-size:14px;">✓</span>' : ''}
      </div>`;
    }).join('');
    dd.style.display = 'block';
  } else {
    dd.style.display = 'none';
  }
}

function selectTicTacToeDream(id, e) {
  if (e) e.stopPropagation();
  ticTacToe.dreamId = id;
  document.getElementById('tttDreamDropdown').style.display = 'none';
  resetTicTacToe(); 
}

document.addEventListener('click', function(e) {
  var dd = document.getElementById('tttDreamDropdown');
  var sel = document.getElementById('tttDreamSelector');
  if (dd && dd.style.display === 'block' && sel && !sel.contains(e.target) && !dd.contains(e.target)) {
    dd.style.display = 'none';
  }
});

// --- 历史记录 ---
var tttHistoryEditMode = false;
var tttHistorySelected = [];

function openTicTacToeHistory() {
  tttHistoryEditMode = false;
  tttHistorySelected = [];
  updateTTTHistoryUI();
  renderTTTHistoryList();
  navigateTo('pageTicTacToeHistory');
}

function toggleTicTacToeHistoryEdit() {
  tttHistoryEditMode = !tttHistoryEditMode;
  if (!tttHistoryEditMode) tttHistorySelected = [];
  updateTTTHistoryUI();
  renderTTTHistoryList();
}

function updateTTTHistoryUI() {
  var btn = document.getElementById('tttHistoryEditBtn');
  var bar = document.getElementById('tttHistoryBottomBar');
  if (btn) btn.textContent = tttHistoryEditMode ? '完成' : '编辑';
  if (bar) bar.style.display = tttHistoryEditMode ? 'flex' : 'none';
}

function saveTTTHistory(winner, reason) {
  if (!state.tttHistory) state.tttHistory = [];
  if (!ticTacToe.startTime) return;

  var dream = state.dreams.find(x => x.id === ticTacToe.dreamId);
  var record = {
    id: 'th_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    startTime: ticTacToe.startTime, endTime: Date.now(),
    duration: Math.floor((Date.now() - ticTacToe.startTime) / 1000),
    dreamName: dream ? dream.name : '未知梦角', dreamAvatar: dream ? dream.avatar : '',
    userColor: ticTacToe.userColor, winner: winner, reason: reason
  };
  state.tttHistory.push(record);
  saveState();
  ticTacToe.startTime = null;
}

function renderTTTHistoryList() {
  var container = document.getElementById('tttHistoryList');
  if (!container) return;
  if (!state.tttHistory || state.tttHistory.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:var(--gray); padding:40px 20px; font-size:14px;">还没有对弈记录哦</div>';
    return;
  }

  var sorted = state.tttHistory.slice().sort((a, b) => b.endTime - a.endTime);
  var html = '';
  sorted.forEach(function(r) {
    var isSelected = tttHistorySelected.indexOf(r.id) > -1;
    var t = new Date(r.startTime);
    var timeStr = (t.getMonth()+1) + '月' + t.getDate() + '日 ' + String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');
    var durationStr = Math.floor(r.duration / 60) + '分' + (r.duration % 60) + '秒';

    var titleStr = r.userColor === 0 ? r.dreamName + ' 的对局' : '和 ' + r.dreamName + ' 的对局';
    var colorInfoStr = '';
    if (r.userColor === 0 && r.p1Name) {
        colorInfoStr = r.p1Name + '执' + (r.p1Color === 1 ? '叉' : '圈') + '，' + r.p2Name + '执' + (r.p2Color === 1 ? '叉' : '圈');
    } else {
        colorInfoStr = '我执' + (r.userColor === 1 ? '叉' : '圈') + '，' + r.dreamName + '执' + (r.userColor === 1 ? '圈' : '叉');
    }

    var resultStr = '';
    var resultColor = '';
    if (r.winner === 'ai') {
      resultStr = r.winnerName + ' 获胜'; resultColor = '#007aff';
    } else if (r.winner === 'user') {
      resultStr = (r.reason === 'resign' ? '对方认输，你赢了' : '你赢了'); resultColor = '#34c759';
    } else if (r.winner === 'dream') {
      resultStr = (r.reason === 'resign' ? '你认输了' : r.dreamName + ' 赢了'); resultColor = '#ff3b30';
    } else {
      resultStr = '平局'; resultColor = '#86868b';
    }

    html += `<div onclick="toggleTTTHistorySelect('${r.id}')" style="display:flex; gap:12px; padding:14px; background:var(--card); border-radius:12px; margin-bottom:10px; border:1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}; transition:all 0.2s;">
      ${tttHistoryEditMode ? `<div style="width:22px;height:22px;border-radius:50%;border:2px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}; background:${isSelected ? 'var(--blue)' : 'transparent'}; display:flex;justify-content:center;align-items:center;color:#fff;font-size:12px;flex-shrink:0;margin-top:12px;">${isSelected ? '✓' : ''}</div>` : ''}
      ${r.userColor !== 0 ? `<img src="${r.dreamAvatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27 viewBox=%270 0 40 40%27%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%2720%27 fill=%27%23ffe0e8%27/%3E%3Ctext x=%2720%27 y=%2725%27 text-anchor=%27middle%27 fill=%27%23d6336c%27 font-size=%2716%27%3E💜%3C/text%3E%3C/svg%3E'}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;margin-top:4px;">` : ''}
      <div style="flex:1; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:14px; font-weight:600; color:var(--text);">${titleStr}</span>
          <span style="font-size:12px; color:${resultColor}; font-weight:600;">${resultStr}</span>
        </div>
        <div style="font-size:12px; color:var(--gray); margin-bottom:4px;">${timeStr} | 耗时 ${durationStr}</div>
        <div style="font-size:11px; color:#999;">${colorInfoStr}</div>
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

function toggleTTTHistorySelect(id) {
  if (!tttHistoryEditMode) return;
  var idx = tttHistorySelected.indexOf(id);
  if (idx > -1) tttHistorySelected.splice(idx, 1);
  else tttHistorySelected.push(id);
  renderTTTHistoryList();
}

function tttHistorySelectAll() {
  if (!state.tttHistory) return;
  if (tttHistorySelected.length === state.tttHistory.length) tttHistorySelected = [];
  else tttHistorySelected = state.tttHistory.map(x => x.id);
  renderTTTHistoryList();
}

function deleteSelectedTicTacToeHistory() {
  if (tttHistorySelected.length === 0) return showToast('请先选择要删除的记录');
  if (!confirm('确定删除选中的 ' + tttHistorySelected.length + ' 条记录吗？')) return;
  state.tttHistory = state.tttHistory.filter(x => tttHistorySelected.indexOf(x.id) === -1);
  tttHistorySelected = [];
  tttHistoryEditMode = false;
  updateTTTHistoryUI();
  saveState();
  renderTTTHistoryList();
  showToast('已删除');
}

// --- 观战与后台引擎 ---
function startTicTacToeSpectate() {
  if (!state.dreams || state.dreams.length < 2) return showToast('至少需要两个梦角');
  
  // 加上容错，防止未初始化导致报错
  if (!state.tttAiMatches) state.tttAiMatches = [];

  var activeMatch = state.tttAiMatches.find(m => m.active);
  if (activeMatch) {
    if (confirm('当前有正在进行的梦角对局，是否直接进入观战？')) {
      enterTTTSpectateMode(activeMatch.id);
      return;
    }
  }
  
  window._spectateTTTSelectedIds = [];
  renderSpectateTTTDreamPicker();
  document.getElementById('spectateTTTDreamPickerModal').style.display = 'flex';
}

function renderSpectateTTTDreamPicker() {
  var list = document.getElementById('spectateTTTDreamPickerList');
  var btn = document.getElementById('spectateTTTStartBtn');
  if (!list || !btn) return;
  list.innerHTML = state.dreams.map(function(d) {
    var isSelected = window._spectateTTTSelectedIds.indexOf(d.id) > -1;
    var avatarSrc = d.avatar || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2736%27 height=%2736%27 viewBox=%270 0 36 36%27%3E%3Ccircle cx=%2718%27 cy=%2718%27 r=%2718%27 fill=%27%23dff0ff%27/%3E%3Ctext x=%2718%27 y=%2723%27 text-anchor=%27middle%27 fill=%27%23007aff%27 font-size=%2714%27%3E💜%3C/text%3E%3C/svg%3E';
    return `<div onclick="toggleSpectateTTTDream('${d.id}')" style="display:flex; align-items:center; padding:12px; border-radius:12px; border:1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}; background:${isSelected ? 'rgba(0,122,255,0.05)' : 'transparent'}; cursor:pointer; transition:all 0.2s;">
      <img src="${avatarSrc}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; margin-right:12px;">
      <span style="flex:1; font-size:15px; font-weight:${isSelected ? '600' : '400'}; color:var(--text);">${d.name}</span>
      <div style="width:20px; height:20px; border-radius:50%; border:2px solid ${isSelected ? 'var(--blue)' : '#ccc'}; display:flex; justify-content:center; align-items:center; background:${isSelected ? 'var(--blue)' : 'transparent'};">
        ${isSelected ? '<span style="color:#fff; font-size:12px;">✓</span>' : ''}
      </div>
    </div>`;
  }).join('');
  if (window._spectateTTTSelectedIds.length === 2) { btn.disabled = false; btn.style.opacity = '1'; }
  else { btn.disabled = true; btn.style.opacity = '0.5'; }
}

function toggleSpectateTTTDream(id) {
  var idx = window._spectateTTTSelectedIds.indexOf(id);
  if (idx > -1) window._spectateTTTSelectedIds.splice(idx, 1);
  else {
    if (window._spectateTTTSelectedIds.length >= 2) window._spectateTTTSelectedIds.shift();
    window._spectateTTTSelectedIds.push(id);
  }
  renderSpectateTTTDreamPicker();
}

function closeSpectateTTTDreamPicker() {
  document.getElementById('spectateTTTDreamPickerModal').style.display = 'none';
}

function confirmSpectateTTTMatch() {
  if (window._spectateTTTSelectedIds.length !== 2) return;
  var d1 = state.dreams.find(x => x.id === window._spectateTTTSelectedIds[0]);
  var d2 = state.dreams.find(x => x.id === window._spectateTTTSelectedIds[1]);
  if (!d1 || !d2) return showToast('梦角不存在');
  if (d1.id === d2.id) return showToast('不能选择同一个人');
  var isBusy = state.tttAiMatches && state.tttAiMatches.some(m => m.active && (m.p1Id === d1.id || m.p2Id === d1.id || m.p1Id === d2.id || m.p2Id === d2.id));
  if (isBusy) return showToast('其中一名梦角正在其他对局中');
  closeSpectateTTTDreamPicker();
  createTTTAiMatch(d1, d2, null);
}

function createTTTAiMatch(d1, d2, triggerChatId) {
  if (!state.tttAiMatches) state.tttAiMatches = [];
  var matchId = 'ttt_' + Date.now();
  var match = {
    id: matchId, p1Id: d1.id, p1Name: d1.name, p1Color: Math.random() < 0.5 ? 1 : 2,
    p2Id: d2.id, p2Name: d2.name, p2Color: 0,
    board: Array(9).fill(0), moves: [], active: true, startTime: Date.now(),
    triggerChatId: triggerChatId, turnColor: 1,
    p1UndoLeft: 3, p2UndoLeft: 3
  };
  match.p2Color = match.p1Color === 1 ? 2 : 1;
  state.tttAiMatches.push(match); saveState();
  if (!triggerChatId) enterTTTSpectateMode(matchId);
  else sendTTTInviteCard(match, d1);
  runTTTAiMatchEngine(matchId);
}

function runTTTAiMatchEngine(matchId) {
  var match = state.tttAiMatches.find(m => m.id === matchId);
  if (!match || !match.active) return;
  
  setTimeout(function() {
    var matchNow = state.tttAiMatches.find(m => m.id === matchId);
    if (!matchNow || !matchNow.active) return;

    var color = matchNow.turnColor;
    var enemyColor = color === 1 ? 2 : 1;

    var move = getBestTTTMove(matchNow.board, color, enemyColor, null);
    
    if (move !== -1) {
      matchNow.board[move] = color;
      matchNow.moves.push({index: move, color: color});
      
      if (ticTacToe.mode === 'spectate' && ticTacToe.spectateMatchId === matchId) {
        ticTacToe.board = matchNow.board; 
        ticTacToe.currentTurn = matchNow.turnColor; 
        drawTTTBoard(); 
      }

      if (checkTTTWin(matchNow.board, color)) { 
        endTTTAiMatch(matchNow, color === matchNow.p1Color ? matchNow.p1Id : matchNow.p2Id); 
        return; 
      }
      if (matchNow.moves.length >= 9) { 
        endTTTAiMatch(matchNow, 'draw'); 
        return; 
      }
      
      matchNow.turnColor = enemyColor;
      saveState();

      if (ticTacToe.mode === 'spectate' && ticTacToe.spectateMatchId === matchId) {
        updateTTTUI();
      }
      runTTTAiMatchEngine(matchId);
    }
  }, 1000 + Math.random() * 1000);
}

function endTTTAiMatch(match, winnerId) {
  match.active = false; match.endTime = Date.now(); match.winner = winnerId;
  match.duration = Math.floor((match.endTime - match.startTime) / 1000);
  saveState();
  var winnerName = winnerId === 'draw' ? '平局' : (winnerId === match.p1Id ? match.p1Name : match.p2Name);
  
  if (!state.tttHistory) state.tttHistory = [];
  state.tttHistory.push({
    id: match.id, startTime: match.startTime, endTime: match.endTime, duration: match.duration,
    dreamName: match.p1Name + ' vs ' + match.p2Name, dreamAvatar: '',
    userColor: 0, winner: winnerId === 'draw' ? 'draw' : 'ai', winnerName: winnerName,
    reason: 'line',
    p1Name: match.p1Name, p2Name: match.p2Name, p1Color: match.p1Color, p2Color: match.p2Color
  });
  saveState();
  
  if (ticTacToe.mode === 'spectate' && ticTacToe.spectateMatchId === match.id) {
    ticTacToe.board = match.board; drawTTTBoard(); updateTTTUI(); 
    showToast('对局结束：' + winnerName + ' 获胜');
  }
  
  if (match.triggerChatId) sendTTTResultCard(match);
}

function enterTTTSpectateMode(matchId) {
  var match = state.tttAiMatches.find(m => m.id === matchId);
  if (!match) return showToast('对局已结束或不存在');
  ticTacToe.mode = 'spectate'; ticTacToe.spectateMatchId = matchId;
  ticTacToe.board = match.board; ticTacToe.currentTurn = match.turnColor;
  navigateTo('pageTicTacToe'); updateTTTUI();
  setTimeout(drawTTTBoard, 50); renderTTTChats();
}

function sendTTTInviteCard(match, initiatorDream) {
  if (!state.chatSessions[match.triggerChatId]) state.chatSessions[match.triggerChatId] = [];
  state.chatSessions[match.triggerChatId].push({
    from: 'dream', senderId: initiatorDream.id, senderName: initiatorDream.name,
    type: 'ttt_invite', matchId: match.id, p1Name: match.p1Name, p2Name: match.p2Name, time: Date.now()
  });
  saveState();
  if (state.currentChatId === match.triggerChatId) { loadChatMessages(); renderChatMessages(); }
  try { renderChatList(); updateAppIconBadges(); } catch(e) {}
}

function sendTTTResultCard(match) {
  if (!state.chatSessions[match.triggerChatId]) return;
  var winnerName = match.winner === 'draw' ? '平局' : (match.winner === match.p1Id ? match.p1Name : match.p2Name);
  state.chatSessions[match.triggerChatId].push({
    from: 'dream', senderId: match.p1Id, senderName: match.p1Name,
    type: 'ttt_result', matchId: match.id, p1Name: match.p1Name, p2Name: match.p2Name,
    p1Color: match.p1Color, p2Color: match.p2Color,
    winnerName: winnerName, duration: match.duration, time: Date.now()
  });
  saveState();
  if (state.currentChatId === match.triggerChatId) { loadChatMessages(); renderChatMessages(); }
  try { renderChatList(); updateAppIconBadges(); } catch(e) {}
}

// 1% 概率梦角互相发起井字棋对局
setInterval(function() {
  if (!state.dreams || state.dreams.length < 2) return;
  if (state.tttAiMatches && state.tttAiMatches.some(m => m.active)) return;
  if (Math.random() > 0.01) return; 
  var d1 = state.dreams[Math.floor(Math.random() * state.dreams.length)];
  var d2 = state.dreams.filter(d => d.id !== d1.id)[Math.floor(Math.random() * (state.dreams.length - 1))];
  createTTTAiMatch(d1, d2, d1.id); 
}, 60000);

// ==========================================
// ===== 拼豆系统 核心逻辑 (修正版) =====
// ==========================================
(function initPerlerSystem() {
  if (!state.perlerData) state.perlerData = { drafts: [], finished: [] };

  let perler = {
    id: null, w: 16, h: 16, grid: [], ironed: false,
    activeColor: '#333333', tool: 'pen', zoom: 1,
    bgImage: null, bgLocked: false, bgScaleX: 1, bgScaleY: 1, bgRotate: 0, bgOpacity: 0.5, bgX: 0, bgY: 0,
    finalBgImage: null,
    undoStack: [], redoStack: []
  };

  let canvas, ctx, isDrawing = false;
  let currentViewMode = 'drafts', viewingPerlerId = null;
  let perlerListEditMode = false, perlerListSelected = [];
  let isBgMoveMode = false; // 底图移动模式

  // ===== 修复报错：将 applyZoom 放到最前面 =====
    function applyZoom() { 
    var wrapper = document.getElementById('perlerZoomWrapper');
    if (wrapper) wrapper.style.transform = `scale(${perler.zoom})`; // 移除多余的位移
  }

    // ===== 补充：设置长宽弹窗 =====
  window.openPerlerSettings = function() {
    document.getElementById('perlerSettingsModal').classList.add('show');
  };
  window.closePerlerSettings = function() {
    document.getElementById('perlerSettingsModal').classList.remove('show');
  };
    window.applyPerlerSettings = function() {
    var w = parseInt(document.getElementById('perlerWInput').value);
    var h = parseInt(document.getElementById('perlerHInput').value);
    // 去掉了 50 的限制，现在最大允许 200
    if (isNaN(w) || w < 4 || w > 200 || isNaN(h) || h < 4 || h > 200) {
      showToast('尺寸必须在 4-200 之间');
      return;
    }
    if (confirm('修改尺寸会清空当前画布，确定吗？')) {
      resetPerlerCanvas(w, h, null);
      closePerlerSettings();
    }
  };

  window.openPerlerGame = function() {
    navigateTo('pagePerler');
    resetPerlerCanvas(16, 16, null);
  };

  window.exitPerlerGame = function() {
    if (perler.grid.some(row => row.some(c => c !== null))) savePerlerDraft(true);
    navigateTo('pageGame');
  };

  window.resetPerlerCanvas = function(w, h, loadData) {
    perler.w = w; perler.h = h;
    perler.grid = Array(h).fill(0).map(() => Array(w).fill(null));
    perler.ironed = false; perler.zoom = 1; perler.tool = 'pen';
    perler.id = loadData ? loadData.id : 'pb_' + Date.now();
    perler.undoStack = []; perler.redoStack = [];
    perler.finalBgImage = null;
    
    isBgMoveMode = false;
    document.getElementById('bgMoveBtn').style.background = 'var(--card)';
    document.getElementById('bgMoveBtn').style.color = 'var(--text)';
    document.getElementById('perlerBgImage').style.pointerEvents = 'none';
    
    if (loadData && loadData.grid) {
      perler.grid = JSON.parse(JSON.stringify(loadData.grid));
      perler.ironed = loadData.ironed || false;
      perler.bgImage = loadData.bgImage || null;
      perler.bgScaleX = loadData.bgScaleX || 1; perler.bgScaleY = loadData.bgScaleY || 1;
      perler.bgRotate = loadData.bgRotate || 0; perler.bgOpacity = loadData.bgOpacity || 0.5;
      perler.bgX = loadData.bgX || 0; perler.bgY = loadData.bgY || 0;
      
      if (perler.bgImage) {
        document.getElementById('perlerBgImage').src = perler.bgImage;
        document.getElementById('perlerBgImage').style.display = 'block';
      }
    } else {
      perler.bgImage = null;
      document.getElementById('perlerBgImage').src = '';
      document.getElementById('perlerBgImage').style.display = 'none';
    }
    
    toggleBgControls(false);
    setPerlerTool('pen');
    updateCurrentColorBtn();
    renderPerlerColorList();
    resizePerlerCanvas();
    applyBgTransform();
  };

    function resizePerlerCanvas() {
    canvas = document.getElementById('perlerCanvas');
    ctx = canvas.getContext('2d');
    var maxScreenW = Math.min(window.innerWidth * 0.85, 400);
    var maxScreenH = window.innerHeight * 0.45;
    
    // 不再限制最小 10px，完全自适应撑满屏幕
    var cellSize = Math.min(maxScreenW / perler.w, maxScreenH / perler.h);
    
    canvas.width = cellSize * perler.w;
    canvas.height = cellSize * perler.h;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    
    drawPerlerCanvas();
    applyZoom();
  }

  function drawPerlerCanvas() {
    if (!ctx) return;
    var cellSize = canvas.width / perler.w;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (var i = 0; i <= perler.w; i++) { ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, canvas.height); ctx.stroke(); }
    for (var j = 0; j <= perler.h; j++) { ctx.beginPath(); ctx.moveTo(0, j * cellSize); ctx.lineTo(canvas.width, j * cellSize); ctx.stroke(); }

    for (var y = 0; y < perler.h; y++) {
      for (var x = 0; x < perler.w; x++) {
        var color = perler.grid[y][x];
        if (color) {
          ctx.fillStyle = color;
          var pad = cellSize * 0.1;
          ctx.fillRect(x * cellSize + pad, y * cellSize + pad, cellSize - pad*2, cellSize - pad*2);
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fillRect(x * cellSize + pad, y * cellSize + pad, cellSize - pad*2, (cellSize - pad*2)/3);
        }
      }
    }

    if (perler.ironed) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      for(var y=0; y<perler.h; y++){
        for(var x=0; x<perler.w; x++){
          if (perler.grid[y][x]) ctx.fillRect(x*cellSize, y*cellSize, cellSize, cellSize);
        }
      }
    }
  }

  // ================= 绘制与事件 =================
  function getCanvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    var cx = e.touches ? e.touches[0].clientX : e.clientX;
    var cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      col: Math.floor((cx - rect.left) * (canvas.width / rect.width) / (canvas.width / perler.w)),
      row: Math.floor((cy - rect.top) * (canvas.height / rect.height) / (canvas.height / perler.h))
    };
  }

  function pushHistory() {
    perler.undoStack.push(JSON.parse(JSON.stringify(perler.grid)));
    if (perler.undoStack.length > 30) perler.undoStack.shift();
    perler.redoStack = [];
  }

  window.perlerUndo = function() {
    if (perler.undoStack.length === 0) return showToast('没有可撤销的操作');
    perler.redoStack.push(JSON.parse(JSON.stringify(perler.grid)));
    perler.grid = perler.undoStack.pop();
    if (perler.ironed) { perler.ironed = false; updateIronUI(); }
    drawPerlerCanvas();
  };

  window.perlerRedo = function() {
    if (perler.redoStack.length === 0) return showToast('没有可前进的操作');
    perler.undoStack.push(JSON.parse(JSON.stringify(perler.grid)));
    perler.grid = perler.redoStack.pop();
    if (perler.ironed) { perler.ironed = false; updateIronUI(); }
    drawPerlerCanvas();
  };

  function paintCell(col, row) {
    if (col < 0 || col >= perler.w || row < 0 || row >= perler.h) return;
    var changed = false;
    if (perler.tool === 'pen' && perler.grid[row][col] !== perler.activeColor) {
      perler.grid[row][col] = perler.activeColor;
      changed = true;
    } else if (perler.tool === 'eraser' && perler.grid[row][col] !== null) {
      perler.grid[row][col] = null;
      changed = true;
    }
    if (changed) {
      drawPerlerCanvas();
      if (perler.ironed) { perler.ironed = false; updateIronUI(); }
    }
  }

  setTimeout(() => {
    var cvs = document.getElementById('perlerCanvas');
    if (!cvs || cvs._bound) return;
    cvs._bound = true;

    cvs.addEventListener('mousedown', (e) => { if(perler.tool==='iron'||isBgMoveMode) return; pushHistory(); isDrawing = true; var p = getCanvasPos(e); paintCell(p.col, p.row); });
    cvs.addEventListener('mousemove', (e) => { if(isDrawing && !isBgMoveMode) paintCell(getCanvasPos(e).col, getCanvasPos(e).row); });
    window.addEventListener('mouseup', () => isDrawing = false);
    
    cvs.addEventListener('touchstart', (e) => { if(perler.tool==='iron'||isBgMoveMode) return; pushHistory(); isDrawing = true; var p = getCanvasPos(e); paintCell(p.col, p.row); if(e.cancelable) e.preventDefault(); }, {passive: false});
    cvs.addEventListener('touchmove', (e) => { if(isDrawing && !isBgMoveMode) { paintCell(getCanvasPos(e).col, getCanvasPos(e).row); if(e.cancelable) e.preventDefault(); } }, {passive: false});
    window.addEventListener('touchend', () => isDrawing = false);
  }, 500);

  // ================= 工具栏 & 颜色 =================
  window.setPerlerTool = function(tool) {
    perler.tool = tool;
    document.querySelectorAll('.perler-tool').forEach(el => el.classList.remove('active'));
    if (tool === 'pen') document.getElementById('toolPen').classList.add('active');
    if (tool === 'eraser') document.getElementById('toolEraser').classList.add('active');
    
    if (tool === 'iron') {
      document.getElementById('toolIron').classList.add('active');
      if (!perler.grid.some(row => row.some(c => c !== null))) { showToast('画布是空的'); setPerlerTool('pen'); return; }
      if (confirm('确定熨烫定型吗？定型后将无法修改格子。')) {
        perler.ironed = true;
        drawPerlerCanvas();
        updateIronUI();
        showToast('熨烫完成，可以加背景或保存啦');
      } else {
        setPerlerTool('pen');
      }
    }
  };

  function updateIronUI() {
    var btn = document.getElementById('perlerSaveBtn');
    if (perler.ironed) {
      btn.style.background = 'var(--blue)';
      btn.style.cursor = 'pointer';
      btn.textContent = '保存成品';
    } else {
      btn.style.background = '#ccc';
      btn.style.cursor = 'not-allowed';
      btn.textContent = '熨烫后保存';
    }
  }

  function updateCurrentColorBtn() {
    var btn = document.getElementById('currentColorBtn');
    if (perler.activeColor === '#333333') {
      btn.style.background = 'transparent'; btn.style.zIndex = '0';
    } else {
      btn.style.background = perler.activeColor; btn.style.zIndex = '2';
    }
  }

  // 修复：加到从右数第二个（第一位是调色盘）
  window.handleCustomColorChange = function(val) {
    perler.activeColor = val;
    if (perler.tool !== 'pen') setPerlerTool('pen');
    
    if (!state.perlerData.colors.includes(val)) {
      state.perlerData.colors.unshift(val); // 👈 使用 unshift 插入到最前面，也就是数组第一个，渲染时紧跟调色盘
      saveState();
    }
    updateCurrentColorBtn();
    renderPerlerColorList();
    showToast('已切换颜色');
  };

  function renderPerlerColorList() {
    var list = document.getElementById('perlerColorList');
    if (!state.perlerData.colors || state.perlerData.colors.length === 0) {
      state.perlerData.colors = ['#333333', '#666666', '#999999', '#cccccc', '#88ccff', '#ffcc99', '#ff6666', '#66cc99'];
    }
    list.innerHTML = state.perlerData.colors.map(color => {
      return `<div class="perler-color-dot ${perler.activeColor === color ? 'active' : ''}" style="background:${color};" onclick="pickPerlerColor('${color}')"></div>`;
    }).join('');
  }

  window.pickPerlerColor = function(color) {
    perler.activeColor = color;
    if (perler.tool !== 'pen') setPerlerTool('pen');
    updateCurrentColorBtn();
    renderPerlerColorList();
  };

  // ================= 底图设置 =================
  window.toggleBgControls = function(forceOpen) {
    var panel = document.getElementById('perlerBgControls');
    if (forceOpen === true) {
      panel.style.display = 'flex';
    } else if (forceOpen === false) {
      panel.style.display = 'none';
    } else {
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    }
    if (panel.style.display === 'flex' && !perler.bgImage) {
      document.getElementById('perlerImgInput').click();
      panel.style.display = 'none'; 
    }
  };

  // 修复：移动底图模式
  window.toggleBgMoveMode = function() {
    if (!perler.bgImage) return showToast('请先导入底图');
    isBgMoveMode = !isBgMoveMode;
    var btn = document.getElementById('bgMoveBtn');
    var bgImg = document.getElementById('perlerBgImage');
    
    if (isBgMoveMode) {
      btn.style.background = 'var(--blue)';
      btn.style.color = '#fff';
      bgImg.style.pointerEvents = 'auto';
      bgImg.style.zIndex = '3'; // 放到最上层接收事件
      showToast('现在可以拖拽和缩放底图了');
    } else {
      btn.style.background = 'var(--card)';
      btn.style.color = 'var(--text)';
      bgImg.style.pointerEvents = 'none';
      bgImg.style.zIndex = '1';
      showToast('已切回画笔模式');
    }
  };

  window.handlePerlerBgUpload = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var canvasRatio = canvas.width / canvas.height;
        var imgRatio = img.width / img.height;
        perler.bgScaleX = 1; perler.bgScaleY = 1;
        if (imgRatio > canvasRatio) perler.bgScaleY = canvasRatio / imgRatio;
        else perler.bgScaleX = imgRatio / canvasRatio;
        
        perler.bgImage = ev.target.result;
        perler.bgX = 0; perler.bgY = 0; perler.bgRotate = 0; perler.bgOpacity = 0.5;
        
        var bgImgEl = document.getElementById('perlerBgImage');
        bgImgEl.src = perler.bgImage;
        bgImgEl.style.display = 'block';
        
        document.getElementById('perlerBgControls').style.display = 'flex';
        applyBgTransform();
        updateBgControlUI();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  window.clearPerlerBg = function() {
    perler.bgImage = null;
    document.getElementById('perlerBgImage').src = '';
    document.getElementById('perlerBgImage').style.display = 'none';
    document.getElementById('perlerBgControls').style.display = 'none';
    toggleBgMoveMode(); // 退出移动模式
    showToast('底图已清除');
  };

  function updateBgControlUI() {
    document.getElementById('bgOpacity').value = perler.bgOpacity;
    document.getElementById('bgScaleX').value = perler.bgScaleX;
    document.getElementById('bgScaleY').value = perler.bgScaleY;
    document.getElementById('bgRotate').value = perler.bgRotate;
  }

  // 修复：居中计算逻辑
  function applyBgTransform() {
    var bgImgEl = document.getElementById('perlerBgImage');
    if (!bgImgEl || !perler.bgImage) return;
    bgImgEl.style.width = canvas.width + 'px';
    bgImgEl.style.height = canvas.height + 'px';
    bgImgEl.style.transform = `translate(calc(-50% + ${perler.bgX}px), calc(-50% + ${perler.bgY}px)) scale(${perler.bgScaleX}, ${perler.bgScaleY}) rotate(${perler.bgRotate}deg)`;
    bgImgEl.style.opacity = perler.bgOpacity;
  }

  // 滑块和拖拽事件
  setTimeout(() => {
    ['bgOpacity', 'bgScaleX', 'bgScaleY', 'bgRotate'].forEach(id => {
      var el = document.getElementById(id);
      if (el && !el._bound) {
        el._bound = true;
        el.addEventListener('input', function() {
          if (id === 'bgOpacity') perler.bgOpacity = parseFloat(this.value);
          if (id === 'bgScaleX') perler.bgScaleX = parseFloat(this.value);
          if (id === 'bgScaleY') perler.bgScaleY = parseFloat(this.value);
          if (id === 'bgRotate') perler.bgRotate = parseInt(this.value);
          applyBgTransform();
        });
      }
    });

    var bgImgEl = document.getElementById('perlerBgImage');
    if (bgImgEl && !bgImgEl._bound) {
      bgImgEl._bound = true;
      var isDrag = false, sX = 0, sY = 0, iX = 0, iY = 0;

      bgImgEl.addEventListener('mousedown', onStart);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', () => isDrag = false);
      bgImgEl.addEventListener('touchstart', onStart, {passive: false});
      document.addEventListener('touchmove', onMove, {passive: false});
      document.addEventListener('touchend', () => isDrag = false);

      function onStart(e) {
        if (!isBgMoveMode) return; // 只有在移动模式下才能拖拽
        var cx = e.touches ? e.touches[0].clientX : e.clientX;
        var cy = e.touches ? e.touches[0].clientY : e.clientY;
        isDrag = true; sX = cx; sY = cy; iX = perler.bgX; iY = perler.bgY;
        if (e.cancelable) e.preventDefault();
      }
      function onMove(e) {
        if (!isDrag || !isBgMoveMode) return;
        var cx = e.touches ? e.touches[0].clientX : e.clientX;
        var cy = e.touches ? e.touches[0].clientY : e.clientY;
        perler.bgX = iX + (cx - sX) / perler.zoom;
        perler.bgY = iY + (cy - sY) / perler.zoom;
        applyBgTransform();
        if (e.cancelable) e.preventDefault();
      }
    }
  }, 600);

    // 双指缩放逻辑（如果在移动底图模式，就缩放底图；否则缩放画布）
  var container = document.getElementById('pagePerler');
  var initDist = 0, initZoom = 1;
  var initScaleX = 1, initScaleY = 1;
  
  container.addEventListener('touchstart', e => { 
    if(e.touches.length === 2){ 
      isDrawing = false; 
      initDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); 
      initZoom = perler.zoom; 
      initScaleX = perler.bgScaleX;
      initScaleY = perler.bgScaleY;
    } 
  }, {passive: false});
  
  container.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();
      var dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      
      if (initDist > 0) { 
        var ratio = dist / initDist;
        
        // 【核心修改】：如果开启了“移动底图”并且有底图，就缩放底图
        if (isBgMoveMode && perler.bgImage) {
          perler.bgScaleX = Math.max(0.1, initScaleX * ratio);
          perler.bgScaleY = Math.max(0.1, initScaleY * ratio);
          applyBgTransform();
          // 同步更新下方滑块的值
          document.getElementById('bgScaleX').value = perler.bgScaleX;
          document.getElementById('bgScaleY').value = perler.bgScaleY;
        } else {
          // 否则缩放整个画布
          perler.zoom = Math.max(0.5, Math.min(5, initZoom * ratio)); 
          applyZoom(); 
        }
      }
    }
  }, {passive: false});

  // ================= 保存与生成 =================
  window.triggerFinalBgUpload = function() {
    if (!perler.ironed) return showToast('请先熨烫定型');
    document.getElementById('perlerFinalBgInput').click();
  };

  window.handlePerlerFinalBg = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) { 
      perler.finalBgImage = ev.target.result; 
      document.getElementById('perlerFinalBgBtn').style.color = 'var(--blue)';
      document.getElementById('perlerFinalBgBtn').style.borderColor = 'var(--blue)';
      showToast('已添加成品背景'); 
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  function generatePerlerSnapshot() {
    return new Promise(resolve => {
      var expCanvas = document.createElement('canvas');
      var scale = 4, padding = 20;
      expCanvas.width = canvas.width * scale + padding*2;
      expCanvas.height = canvas.height * scale + padding*2;
      var eCtx = expCanvas.getContext('2d');

      function drawPixels() {
        eCtx.save();
        eCtx.translate(padding, padding);
        eCtx.scale(scale, scale);
        var cellSize = canvas.width / perler.w;
        for (var y = 0; y < perler.h; y++) {
          for (var x = 0; x < perler.w; x++) {
            var color = perler.grid[y][x];
            if (color) {
              eCtx.fillStyle = color;
              var pad = cellSize * 0.1;
              eCtx.fillRect(x * cellSize + pad, y * cellSize + pad, cellSize - pad*2, cellSize - pad*2);
              eCtx.fillStyle = 'rgba(255,255,255,0.2)';
              eCtx.fillRect(x * cellSize + pad, y * cellSize + pad, cellSize - pad*2, (cellSize - pad*2)/3);
            }
          }
        }
        eCtx.restore();
        resolve(expCanvas.toDataURL('image/png'));
      }

      if (perler.finalBgImage) {
        var bg = new Image();
        bg.onload = function() { eCtx.drawImage(bg, 0, 0, expCanvas.width, expCanvas.height); drawPixels(); };
        bg.src = perler.finalBgImage;
      } else {
        drawPixels();
      }
    });
  }

    window.savePerlerDraft = function(isAuto) {
    if (!perler.grid.some(row => row.some(c => c !== null))) {
      if (!isAuto) showToast('画布为空'); return;
    }
    
    // 生成截图作为封面
    var previewData = '';
    var expCanvas = document.createElement('canvas');
    var scale = 2, padding = 10;
    expCanvas.width = canvas.width * scale + padding*2;
    expCanvas.height = canvas.height * scale + padding*2;
    var eCtx = expCanvas.getContext('2d');
    eCtx.fillStyle = '#f5f5f7'; // 白底
    eCtx.fillRect(0, 0, expCanvas.width, expCanvas.height);
    eCtx.save();
    eCtx.translate(padding, padding);
    eCtx.scale(scale, scale);
    
    var cellSize = canvas.width / perler.w;
    for (var y = 0; y < perler.h; y++) {
      for (var x = 0; x < perler.w; x++) {
        var color = perler.grid[y][x];
        if (color) {
          eCtx.fillStyle = color;
          var pad = cellSize * 0.1;
          eCtx.fillRect(x * cellSize + pad, y * cellSize + pad, cellSize - pad*2, cellSize - pad*2);
        }
      }
    }
    eCtx.restore();
    previewData = expCanvas.toDataURL('image/png');

    var draftData = {
      id: perler.id, w: perler.w, h: perler.h, grid: JSON.parse(JSON.stringify(perler.grid)), ironed: perler.ironed,
      bgImage: perler.bgImage, bgScaleX: perler.bgScaleX, bgScaleY: perler.bgScaleY, bgRotate: perler.bgRotate, bgOpacity: perler.bgOpacity, bgX: perler.bgX, bgY: perler.bgY,
      imgData: previewData, // 👈 把生成的图片存进去
      updateTime: Date.now()
    };
    
    var idx = state.perlerData.drafts.findIndex(d => d.id === draftData.id);
    if (idx > -1) state.perlerData.drafts[idx] = draftData;
    else state.perlerData.drafts.push(draftData);
    saveState();
    if (!isAuto) { showToast('已暂存'); navigateTo('pageGame'); }
  };

  window.savePerlerFinished = function() {
    if (!perler.ironed) return showToast('请先熨烫');
    generatePerlerSnapshot().then(snapshot => {
      var finishedData = { id: perler.id, imgData: snapshot, createTime: Date.now() };
      state.perlerData.drafts = state.perlerData.drafts.filter(d => d.id !== perler.id);
      state.perlerData.finished.push(finishedData);
      saveState();
      showToast('已保存到成品库');
      perler.id = 'pb_' + Date.now();
      navigateTo('pageGame');
    });
  };

  // ================= 列表展示与删除 =================
  window.openPerlerDrafts = function() { currentViewMode = 'drafts'; document.getElementById('perlerListTitle').textContent = '草稿箱'; perlerListEditMode=false; perlerListSelected=[]; renderPerlerList(); navigateTo('pagePerlerList'); };
  window.openPerlerFinished = function() { currentViewMode = 'finished'; document.getElementById('perlerListTitle').textContent = '成品库'; perlerListEditMode=false; perlerListSelected=[]; renderPerlerList(); navigateTo('pagePerlerList'); };

  window.togglePerlerListEdit = function() {
    perlerListEditMode = !perlerListEditMode;
    if (!perlerListEditMode) perlerListSelected = [];
    document.getElementById('perlerListEditBtn').textContent = perlerListEditMode ? '完成' : '编辑';
    document.getElementById('perlerListBottomBar').style.display = perlerListEditMode ? 'flex' : 'none';
    renderPerlerList();
  };

  window.perlerListSelectAll = function() {
    var data = currentViewMode === 'drafts' ? state.perlerData.drafts : state.perlerData.finished;
    if (perlerListSelected.length === data.length) perlerListSelected = [];
    else perlerListSelected = data.map(x => x.id);
    renderPerlerList();
  };

  window.deleteSelectedPerlerItems = function() {
    if (perlerListSelected.length === 0) return showToast('请先选择');
    if (!confirm(`确定删除选中的 ${perlerListSelected.length} 个作品吗？`)) return;
    if (currentViewMode === 'drafts') state.perlerData.drafts = state.perlerData.drafts.filter(d => !perlerListSelected.includes(d.id));
    else state.perlerData.finished = state.perlerData.finished.filter(d => !perlerListSelected.includes(d.id));
    saveState(); togglePerlerListEdit(); showToast('已删除');
  };

  window.togglePerlerSelect = function(id) {
    if (!perlerListEditMode) return;
    var idx = perlerListSelected.indexOf(id);
    if (idx > -1) perlerListSelected.splice(idx, 1);
    else perlerListSelected.push(id);
    renderPerlerList();
  };

    function renderPerlerList() {
    var grid = document.getElementById('perlerListGrid');
    var data = currentViewMode === 'drafts' ? state.perlerData.drafts : state.perlerData.finished;
    if (!data || data.length === 0) { 
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);font-size:14px;">空空如也</div>'; 
      return; 
    }
    
    grid.innerHTML = data.map(item => {
      // 【核心修改】这里优先读取 item.imgData 作为封面图，如果没有才显示白底占位图
      var imgSrc = item.imgData ? item.imgData : 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27%3E%3Crect width=%27100%27 height=%27100%27 fill=%27%23fff%27/%3E%3Ctext x=%2750%27 y=%2755%27 text-anchor=%27middle%27 fill=%27%23ccc%27 font-size=%2714%27%3E无图%3C/text%3E%3C/svg%3E';
      
      var isSel = perlerListSelected.indexOf(item.id) > -1;
      var clickAction = perlerListEditMode ? `togglePerlerSelect('${item.id}')` : (currentViewMode === 'drafts' ? `loadPerlerDraft('${item.id}')` : `viewPerlerFinished('${item.id}')`);
      
      return `<div class="perler-card" onclick="${clickAction}" style="border:2px solid ${isSel ? 'var(--blue)' : 'transparent'};">
        ${perlerListEditMode ? `<div style="position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:50%;border:2px solid #fff;background:${isSel ? 'var(--blue)' : 'rgba(0,0,0,0.3)'};display:flex;justify-content:center;align-items:center;color:#fff;font-size:12px;z-index:10;">${isSel ? '✓' : ''}</div>` : ''}
        <img src="${imgSrc}" style="${currentViewMode === 'finished' ? 'background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/ENFnYGAcBcMwjhoAGkYNAA0jBwAAsS0e0G9QjIkAAAAASUVORK5CYII=) repeat;' : ''}">
        <div class="perler-card-title">${new Date(item.updateTime || item.createTime).toLocaleDateString()}</div>
      </div>`;
    }).join('');
  }

  window.loadPerlerDraft = function(id) { var d = state.perlerData.drafts.find(x => x.id === id); if(d) { resetPerlerCanvas(d.w, d.h, d); navigateTo('pagePerler'); showToast('已载入草稿'); } };
  window.viewPerlerFinished = function(id) { var i = state.perlerData.finished.find(x => x.id === id); if(i) { viewingPerlerId = id; document.getElementById('perlerViewImg').src = i.imgData; navigateTo('pagePerlerView'); } };
  window.savePerlerToAlbum = function() { var i = state.perlerData.finished.find(x => x.id === viewingPerlerId); if(i) { var a = document.createElement('a'); a.href = i.imgData; a.download = '拼豆_'+Date.now()+'.png'; a.click(); showToast('已保存到相册'); } };
  
  // 分享
  window.openPerlerShare = function() {
    var list = document.getElementById('perlerShareList'), html = '';
    if (state.dreams) state.dreams.forEach(d => { html += `<div onclick="doSharePerler('${d.id}')" style="display:flex;align-items:center;padding:12px;border-bottom:1px solid #eee;cursor:pointer;"><img src="${d.avatar||''}" style="width:40px;height:40px;border-radius:50%;margin-right:12px;object-fit:cover;"><span>${d.name}</span></div>`; });
    if (state.groups) state.groups.forEach(g => { html += `<div onclick="doSharePerler('${g.id}')" style="display:flex;align-items:center;padding:12px;border-bottom:1px solid #eee;cursor:pointer;"><img src="${g.avatar||''}" style="width:40px;height:40px;border-radius:50%;margin-right:12px;object-fit:cover;"><span>${g.name}</span></div>`; });
    list.innerHTML = html; document.getElementById('perlerShareModal').classList.add('show');
  };
  window.closePerlerShare = function() { document.getElementById('perlerShareModal').classList.remove('show'); };
  window.doSharePerler = function(targetId) {
    var item = state.perlerData.finished.find(d => d.id === viewingPerlerId); if (!item) return;
    if (!state.chatSessions[targetId]) state.chatSessions[targetId] = [];
    state.chatSessions[targetId].push({ from: 'user', type: 'image', imageData: item.imgData, time: Date.now() });
    saveState(); closePerlerShare(); showToast('分享成功');
  };

})();