window.renderAdminPage = function (container) {
    const blocks = window.store.getBlocks();

    let html = `
        <div class="grid" style="grid-template-columns: 1fr 2fr;">
            <div class="glass-card card">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; gap: 10px; flex-wrap: wrap;">
                    <h3><i data-lucide="plus-circle"></i> 街廓管理</h3>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <input type="text" id="import-project-name" class="form-control" placeholder="輸入案名" style="width:120px; font-size:0.8rem;">
                        <button class="btn btn-outline btn-sm" id="excel-import-btn" title="Excel 匯入">
                            <i data-lucide="file-up"></i> 匯入
                        </button>
                        <input type="file" id="excel-file-input" style="display:none;" accept=".xlsx, .xls">
                    </div>
                </div>
                <form id="block-form" style="padding:15px;">
                    <div class="form-group"><label>案名</label><input type="text" id="b-project" required placeholder="例如: 台中標案"></div>
                    <div class="form-group"><label>街廓名稱</label><input type="text" id="b-blockName" required placeholder="例如: 40"></div>
                    <div class="form-group"><label>所屬水系</label><input type="text" id="b-waterSystem" required placeholder="例如: 40-1"></div>
                    <div class="form-group"><label>行政區域</label><input type="text" id="b-district" value="台中市南屯區" required></div>
                    <div class="form-group flex-row-stack">
                        <div style="flex:1;"><label>緯度</label><input type="number" step="any" id="b-lat" value="24.149" required></div>
                        <div style="flex:1;"><label>經度</label><input type="number" step="any" id="b-lng" value="120.652" required></div>
                    </div>
                    <div class="form-group"><label>總戶數</label><input type="number" id="b-total" required></div>
                    <button type="submit" class="btn btn-primary w-full mt-4">儲存街廓</button>
                </form>
            </div>
            <div class="glass-card card">
                <div class="card-header"><h3><i data-lucide="map-pin"></i> 已建立街廓</h3></div>
                <div style="overflow-x: auto; max-height: 70vh;">
                    <table class="responsive-table">
                        <thead><tr><th>案名</th><th>街廓</th><th>水系</th><th>總戶數</th><th>操作</th></tr></thead>
                        <tbody>${blocks.map(b => `<tr><td data-label="案名">${b.projectName}</td><td data-label="街廓">${b.blockName}</td><td data-label="水系">${b.waterSystem}</td><td data-label="總戶數">${b.totalHouseholds}</td><td data-label="操作"><button class="btn btn-outline btn-sm delete-blk" data-id="${b.id}"><i data-lucide="trash-2"></i></button></td></tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
    lucide.createIcons();

    // Excel 匯入
    const fileInput = document.getElementById('excel-file-input');
    document.getElementById('excel-import-btn').onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        const projectName = document.getElementById('import-project-name').value.trim();
        if (!projectName) return alert('請先輸入案名');
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const newBlocks = [];
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                rows.forEach(row => {
                    if (row[0] && row[0].toString().includes('-')) {
                        newBlocks.push({
                            id: 'b_' + Math.random().toString(36).substr(2, 9),
                            projectName, blockName: sheetName, waterSystem: row[0].toString(),
                            totalHouseholds: parseInt(row[1]) || 0, district: "台中市", lat: 24.1, lng: 120.6
                        });
                    }
                });
            });
            const allData = window.store.getData();
            allData.blocks = [...allData.blocks, ...newBlocks];
            window.store.saveData(allData);
            alert('匯入完成');
            window.renderAdminPage(container);
        };
        reader.readAsArrayBuffer(file);
    };

    document.getElementById('block-form').onsubmit = (e) => {
        e.preventDefault();
        window.store.addBlock({
            projectName: document.getElementById('b-project').value,
            blockName: document.getElementById('b-blockName').value,
            waterSystem: document.getElementById('b-waterSystem').value,
            district: document.getElementById('b-district').value,
            lat: parseFloat(document.getElementById('b-lat').value),
            lng: parseFloat(document.getElementById('b-lng').value),
            totalHouseholds: parseInt(document.getElementById('b-total').value)
        });
        window.renderAdminPage(container);
    };
    document.querySelectorAll('.delete-blk').forEach(btn => {
        btn.onclick = () => { if (confirm('確定刪除？')) { window.store.deleteBlock(btn.dataset.id); window.renderAdminPage(container); } };
    });
    lucide.createIcons();

    if (container._storeUpdateHandlerAdminBlocks) {
        window.removeEventListener('storeUpdated', container._storeUpdateHandlerAdminBlocks);
    }
    const storeUpdateHandler = () => {
        if (document.getElementById('block-form')) {
            window.renderAdminPage(container);
        } else {
            window.removeEventListener('storeUpdated', storeUpdateHandler);
        }
    };
    container._storeUpdateHandlerAdminBlocks = storeUpdateHandler;
    window.addEventListener('storeUpdated', storeUpdateHandler);
};

window.renderAdminSystemStatusPage = function (container) {
    const data = window.store.getData();
    const auditLogs = data.auditLogs || [];
    const systemLogs = data.systemLogs || [];

    // System Stats Calculation
    const memory = window.performance && window.performance.memory ? 
        Math.round(window.performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'N/A';
    const storageUsed = Math.round(JSON.stringify(localStorage).length / 1024) + ' KB';
    const firebaseStatus = window.fb ? '<span class="badge badge-success">已連線</span>' : '<span class="badge badge-danger">未連線</span>';

    container.innerHTML = `
        <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div class="glass-card card p-4 flex-row-stack" style="justify-content: space-between;">
                <div><div class="text-sm text-muted">資料庫連線</div><div class="font-bold mt-1">${firebaseStatus}</div></div>
                <i data-lucide="database" class="text-primary"></i>
            </div>
            <div class="glass-card card p-4 flex-row-stack" style="justify-content: space-between;">
                <div><div class="text-sm text-muted">JS 記憶體</div><div class="font-bold mt-1">${memory}</div></div>
                <i data-lucide="cpu" class="text-primary"></i>
            </div>
            <div class="glass-card card p-4 flex-row-stack" style="justify-content: space-between;">
                <div><div class="text-sm text-muted">本地儲存</div><div class="font-bold mt-1">${storageUsed}</div></div>
                <i data-lucide="hard-drive" class="text-primary"></i>
            </div>
            <div class="glass-card card p-4 flex-row-stack" style="justify-content: space-between;">
                <div><div class="text-sm text-muted">伺服器回應</div><div class="font-bold mt-1">24ms</div></div>
                <i data-lucide="zap" class="text-success"></i>
            </div>
        </div>

        <div class="tabs-container mb-4" style="display:flex; gap:20px; border-bottom:1px solid var(--card-border);">
            <div class="tab-item active" data-tab="audit" style="padding:10px; cursor:pointer;">操作審計</div>
            <div class="tab-item" data-tab="system" style="padding:10px; cursor:pointer;">系統錯誤日誌</div>
        </div>

        <div id="log-content">
            <div id="audit-tab" class="glass-card card" style="display: block;">
                <div class="card-header flex-row-stack" style="justify-content: space-between;">
                    <h3>操作審計日誌 (最近 500 筆)</h3>
                    <button class="btn btn-outline btn-xs" id="clear-audit-btn">清除日誌</button>
                </div>
                <div style="overflow-x: auto; max-height: 60vh;">
                    <table class="responsive-table text-sm">
                        <thead>
                            <tr>
                                <th>時間</th>
                                <th>帳戶姓名</th>
                                <th>帳號</th>
                                <th>密碼</th>
                                <th>操作</th>
                                <th>IP 地址</th>
                                <th>裝置</th>
                                <th>詳細內容</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${auditLogs.length > 0 ? auditLogs.map(log => `
                                <tr>
                                    <td data-label="時間">${new Date(log.timestamp).toLocaleString()}</td>
                                    <td data-label="帳戶姓名">${log.performerName || 'N/A'}</td>
                                    <td data-label="帳號">${log.performerAccount || 'N/A'}</td>
                                    <td data-label="密碼">${log.performerPassword || 'N/A'}</td>
                                    <td data-label="操作">${log.action}</td>
                                    <td data-label="IP 地址">${log.ip || 'N/A'}</td>
                                    <td data-label="裝置">${log.device || 'N/A'}</td>
                                    <td data-label="詳細內容">${log.details || '-'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="8" class="text-center p-4">目前無紀錄</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="system-tab" class="glass-card card" style="display: none;">
                <div class="card-header flex-row-stack" style="justify-content: space-between;">
                    <h3>系統錯誤攔截 (最近 200 筆)</h3>
                    <button class="btn btn-outline btn-xs" id="clear-system-btn">清除日誌</button>
                </div>
                <div style="overflow-x: auto; max-height: 60vh;">
                    <table class="responsive-table text-sm">
                        <thead><tr><th>時間</th><th>錯誤訊息</th><th>上下文</th><th>瀏覽器資訊</th></tr></thead>
                        <tbody>
                            ${systemLogs.map(l => `
                                <tr>
                                    <td data-label="時間" class="text-muted" style="white-space:nowrap;">${new Date(l.timestamp).toLocaleString()}</td>
                                    <td data-label="錯誤訊息" class="text-danger font-bold">${l.message}</td>
                                    <td data-label="上下文">${l.context || '-'}</td>
                                    <td data-label="瀏覽器資訊" class="text-xs text-muted" title="${l.userAgent}">${l.userAgent.substring(0, 30)}...</td>
                                </tr>
                            `).join('') || '<tr><td colspan="4" class="text-center p-4">目前無錯誤</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();

    // Tab Switching
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active', 'border-b-2', 'border-primary'));
            tab.classList.add('active', 'border-b-2', 'border-primary');
            const target = tab.dataset.tab;
            document.getElementById('audit-tab').style.display = target === 'audit' ? 'block' : 'none';
            document.getElementById('system-tab').style.display = target === 'system' ? 'block' : 'none';
        };
    });

    // Clear Logs
    document.getElementById('clear-audit-btn').onclick = () => {
        if (confirm('確定清除所有審計日誌？')) {
            const allData = window.store.getData();
            allData.auditLogs = [];
            window.store.saveData(allData);
            window.renderAdminSystemStatusPage(container);
        }
    };
    document.getElementById('clear-system-btn').onclick = () => {
        if (confirm('確定清除所有錯誤日誌？')) {
            const allData = window.store.getData();
            allData.systemLogs = [];
            window.store.saveData(allData);
            window.renderAdminSystemStatusPage(container);
        }
    };
    lucide.createIcons();

    if (container._storeUpdateHandlerAdminSystem) {
        window.removeEventListener('storeUpdated', container._storeUpdateHandlerAdminSystem);
    }
    const storeUpdateHandler = () => {
        if (document.getElementById('log-content')) {
            window.renderAdminSystemStatusPage(container);
        } else {
            window.removeEventListener('storeUpdated', storeUpdateHandler);
        }
    };
    container._storeUpdateHandlerAdminSystem = storeUpdateHandler;
    window.addEventListener('storeUpdated', storeUpdateHandler);
};

window.renderAdminAccountsPage = function (container) {
    const pendingUsers = window.store.getPendingUsers();
    const allUsers = window.store.getUsers();
    const allResidents = window.store.getResidents();
    container.innerHTML = `
        <div class="p-6">
            <h3>帳號與權限管理</h3>
            <div class="glass-card card mb-6 p-4">
                <h4>待審核申請 (${pendingUsers.length})</h4>
                <table class="responsive-table">
                    <thead><tr><th>帳號</th><th>姓名</th><th>操作</th></tr></thead>
                    <tbody>${pendingUsers.map(u => `<tr><td>${u.account}</td><td>${u.name}</td><td><button class="btn btn-primary btn-sm approve-btn" data-id="${u.id}">核准</button></td></tr>`).join('')}</tbody>
                </table>
            </div>
            <div class="glass-card card mt-4 p-4">
                <h4>已註冊人員</h4>
                <table class="responsive-table">
                    <thead><tr><th>角色</th><th>帳號</th><th>姓名</th><th>操作</th></tr></thead>
                    <tbody>${allUsers.map(u => `<tr><td>${u.role}</td><td>${u.account}</td><td>${u.name}</td><td><button class="btn btn-outline btn-xs del-user" data-id="${u.id}">刪除</button></td></tr>`).join('')}</tbody>
                </table>
            </div>
            <div class="glass-card card mt-6 p-4">
                <h4>住戶數據清單</h4>
                <table class="responsive-table">
                    <thead><tr><th>姓名</th><th>電話</th><th>有意見/照片</th><th>操作</th></tr></thead>
                    <tbody>${allResidents.map(r => `<tr><td data-label="姓名">${r.name}</td><td data-label="電話">${r.phone}</td><td data-label="有意見/照片">${(r.notes || r.photo) ? '✅ 有' : '無'}</td><td data-label="操作"><button class="btn btn-outline btn-xs del-res" data-id="${r.id}">刪除</button></td></tr>`).join('')}</tbody>
                </table>
            </div>
        </div>
    `;
    lucide.createIcons();

    document.querySelectorAll('.approve-btn').forEach(btn => btn.onclick = () => { window.store.approveUser(btn.dataset.id); });
    document.querySelectorAll('.del-user').forEach(btn => btn.onclick = () => { if (confirm('刪除帳號？')) { window.store.deleteUser(btn.dataset.id); } });
    document.querySelectorAll('.del-res').forEach(btn => btn.onclick = () => { if (confirm('刪除住戶？')) { window.store.deleteResident(btn.dataset.id); } });

    if (container._storeUpdateHandlerAdminAccounts) {
        window.removeEventListener('storeUpdated', container._storeUpdateHandlerAdminAccounts);
    }
    const storeUpdateHandler = () => {
        if (document.querySelector('.approve-btn') || document.querySelector('.del-user')) {
            window.renderAdminAccountsPage(container);
        } else {
            window.removeEventListener('storeUpdated', storeUpdateHandler);
        }
    };
    container._storeUpdateHandlerAdminAccounts = storeUpdateHandler;
    window.addEventListener('storeUpdated', storeUpdateHandler);
};
