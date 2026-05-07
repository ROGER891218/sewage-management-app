window.renderConsultantPage = function (container) {
    const blocks = window.store.getBlocks();
    const residents = window.store.getAllResidents();
    const naturalSort = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

    let html = `
        <div class="glass-card card mb-6">
            <div class="card-header flex-row-stack" style="justify-content:space-between; align-items:center;">
                <h3><i data-lucide="bar-chart-2"></i> 區域意願統計總覽</h3>
                <div class="flex-row-stack" style="align-items:center; flex-wrap:wrap;">
                    <select id="filter-project" class="form-control" style="width:auto; padding:5px 8px; font-size:0.8rem;"><option value="all">所有案名</option></select>
                    <select id="filter-block" class="form-control" style="width:auto; padding:5px 8px; font-size:0.8rem;"><option value="all">所有街廓</option></select>
                    <select id="filter-water" class="form-control" style="width:auto; padding:5px 8px; font-size:0.8rem;"><option value="all">所有水系</option></select>
                </div>
            </div>
            <div class="grid" style="grid-template-columns: 2fr 1fr; gap: 24px;">
                <div style="height: 350px; position: relative;"><canvas id="main-chart"></canvas></div>
                <div style="overflow-x: auto; border-left: 1px solid var(--card-border); padding-left: 20px;">
                    <table id="mini-stats-table"><thead><tr><th>項目</th><th>戶數</th></tr></thead><tbody id="mini-stats-body"></tbody></table>
                </div>
            </div>
        </div>
        <div class="glass-card card mt-4">
            <div class="card-header"><h3><i data-lucide="map"></i> 各街廓詳細數據</h3></div>
            <div style="overflow-x: auto;">
                <table class="responsive-table">
                    <thead><tr><th>案名</th><th>街廓</th><th>水系</th><th>前巷</th><th>後巷</th><th>無意見</th><th>未表達</th><th>總戶數</th></tr></thead>
                    <tbody id="block-data-body"></tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
    lucide.createIcons();
    let chartInstance = null;

    const updateUI = () => {
        const selP = document.getElementById('filter-project').value;
        const selB = document.getElementById('filter-block').value;
        const selW = document.getElementById('filter-water').value;
        const currentBlocks = window.store.getBlocks();
        let targetBlocks = currentBlocks;
        if (selP !== 'all') targetBlocks = targetBlocks.filter(b => b.projectName === selP);
        if (selB !== 'all') targetBlocks = targetBlocks.filter(b => b.blockName === selB);
        if (selW !== 'all') targetBlocks = targetBlocks.filter(b => b.waterSystem === selW);

        const totals = targetBlocks.reduce((acc, b) => {
            const s = window.store.getBlockStats(b.id);
            acc.front += (s.front + s.side_front); acc.back += (s.back + s.side_back);
            acc.no_opinion += s.no_opinion; acc.unexpressed += s.unexpressed; acc.total += s.total;
            return acc;
        }, { front: 0, back: 0, no_opinion: 0, unexpressed: 0, total: 0 });

        const chartCtx = document.getElementById('main-chart');
        if (chartCtx && window.Chart) {
            if (chartInstance) chartInstance.destroy();
            chartInstance = new Chart(chartCtx, {
                type: 'pie',
                data: {
                    labels: ['前巷', '後巷', '無意見', '未表達'],
                    datasets: [{ data: [totals.front, totals.back, totals.no_opinion, totals.unexpressed], backgroundColor: ['#2563eb', '#ef4444', '#d946ef', '#94a3b8'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
        document.getElementById('mini-stats-body').innerHTML = `
            <tr><td data-label="項目">前巷</td><td data-label="戶數" class="font-bold" style="color:#2563eb">${totals.front}</td></tr>
            <tr><td data-label="項目">後巷</td><td data-label="戶數" class="font-bold" style="color:#ef4444">${totals.back}</td></tr>
            <tr><td data-label="項目">無意見</td><td data-label="戶數" class="font-bold" style="color:#d946ef">${totals.no_opinion}</td></tr>
            <tr><td data-label="項目">未表達</td><td data-label="戶數" class="font-bold" style="color:#94a3b8">${totals.unexpressed}</td></tr>
            <tr style="border-top:2px solid var(--card-border);"><td data-label="項目">總戶數</td><td data-label="戶數" class="font-bold">${totals.total}</td></tr>
        `;
        document.getElementById('block-data-body').innerHTML = targetBlocks.map(b => {
            const s = window.store.getBlockStats(b.id);
            return `<tr><td data-label="案名">${b.projectName}</td><td data-label="街廓" class="font-bold">${b.blockName}</td><td data-label="水系">${b.waterSystem}</td><td data-label="前巷">${s.front + s.side_front}</td><td data-label="後巷">${s.back + s.side_back}</td><td data-label="無意見">${s.no_opinion}</td><td data-label="未表達">${s.unexpressed}</td><td data-label="總戶數">${s.total}</td></tr>`;
        }).join('');
    };

    const populateFilters = () => {
        const pSelect = document.getElementById('filter-project');
        const bSelect = document.getElementById('filter-block');
        const wSelect = document.getElementById('filter-water');
        
        const currentBlocks = window.store.getBlocks();
        const projects = [...new Set(currentBlocks.map(b => b.projectName))].filter(Boolean).sort(naturalSort);
        pSelect.innerHTML = '<option value="all">所有案名</option>' + projects.map(p => `<option value="${p}">${p}</option>`).join('');
        
        const updateDropdowns = () => {
            const selP = pSelect.value;
            const selB = bSelect.value;
            const selW = wSelect.value;
            
            let targetB = currentBlocks;
            if (selP !== 'all') targetB = targetB.filter(b => b.projectName === selP);
            const bOptions = [...new Set(targetB.map(b => b.blockName))].filter(Boolean).sort(naturalSort);
            bSelect.innerHTML = '<option value="all">所有街廓</option>' + bOptions.map(b => `<option value="${b}">${b}</option>`).join('');
            if (bOptions.includes(selB)) bSelect.value = selB; else bSelect.value = 'all';
            
            let targetW = targetB;
            if (bSelect.value !== 'all') targetW = targetW.filter(b => b.blockName === bSelect.value);
            const wOptions = [...new Set(targetW.map(b => b.waterSystem))].filter(Boolean).sort(naturalSort);
            wSelect.innerHTML = '<option value="all">所有水系</option>' + wOptions.map(w => `<option value="${w}">${w}</option>`).join('');
            if (wOptions.includes(selW)) wSelect.value = selW; else wSelect.value = 'all';
            
            updateUI();
        };

        pSelect.onchange = updateDropdowns;
        bSelect.onchange = updateDropdowns;
        wSelect.onchange = updateUI;
        
        // Initial setup
        updateDropdowns();
    };
    populateFilters();

    if (container._storeUpdateHandlerChart) {
        window.removeEventListener('storeUpdated', container._storeUpdateHandlerChart);
    }
    const storeUpdateHandler = () => {
        if (document.getElementById('main-chart')) {
            updateUI();
        } else {
            window.removeEventListener('storeUpdated', storeUpdateHandler);
        }
    };
    container._storeUpdateHandlerChart = storeUpdateHandler;
    window.addEventListener('storeUpdated', storeUpdateHandler);
};

window.renderConsultantAllocationPage = function (container) {
    const blocks = window.store.getBlocks();
    const residents = window.store.getAllResidents();
    const naturalSort = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

    let activeTab = 'all';

    let html = `
        <div class="glass-card card">
            <div class="card-header flex-row-stack" style="justify-content:space-between; align-items:center;">
                <h3><i data-lucide="users"></i> 住戶街廓分配管理</h3>
                <div class="flex-row-stack">
                    <select id="res-filter-project" class="form-control" style="width:auto;"><option value="all">所有案名</option></select>
                    <select id="res-filter-block" class="form-control" style="width:auto;"><option value="all">所有街廓</option></select>
                    <button class="btn btn-outline btn-sm" id="import-addr-btn"><i data-lucide="file-up"></i> 匯入地址</button>
                    <button class="btn btn-primary btn-sm" id="batch-save-btn">一鍵儲存</button>
                </div>
            </div>
            
            <div class="tabs-container" style="padding:0 15px; margin-top:10px; display:flex; gap:20px; border-bottom:1px solid var(--card-border);">
                <div class="tab-item active" data-tab="all" style="padding:10px 5px; cursor:pointer; font-weight:bold; border-bottom:3px solid var(--primary);">全部</div>
                <div class="tab-item" data-tab="dispute" style="padding:10px 5px; cursor:pointer; color:var(--danger);">待處理/意見 <span id="dispute-count" class="badge badge-danger">0</span></div>
                <div class="tab-item" data-tab="assigned" style="padding:10px 5px; cursor:pointer; color:var(--text-muted);">已核定</div>
                <div class="tab-item" data-tab="unassigned" style="padding:10px 5px; cursor:pointer; color:var(--text-muted);">未分配</div>
            </div>

            <div style="padding:15px;">
                <div id="allocation-table-container" style="overflow-x:auto; border:1px solid var(--card-border); border-radius:8px;"></div>
            </div>
        </div>

        <div id="feedback-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2000; align-items:center; justify-content:center;">
            <div class="glass-card card" style="width:90%; max-width:600px; padding:20px;">
                <div class="flex-row-stack mb-4" style="justify-content:space-between;">
                    <h3>住戶意見與照片</h3>
                    <button class="icon-btn" id="close-feedback-btn"><i data-lucide="x"></i></button>
                </div>
                <div id="feedback-content" style="max-height:60vh; overflow-y:auto;"></div>
            </div>
        </div>

        <div id="addr-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:2000; align-items:center; justify-content:center;">
            <div class="glass-card card" style="width:90%; max-width:500px; padding:20px;">
                <h3>地址批次匯入</h3>
                <textarea id="addr-input" class="form-control mt-4" style="height:200px;" placeholder="每行一個地址..."></textarea>
                <div class="flex-row-stack mt-4">
                    <button class="btn btn-primary w-full" id="save-addr-btn">儲存匯入</button>
                    <button class="btn btn-outline w-full" id="close-addr-btn">取消</button>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
    lucide.createIcons();

    const renderTable = (addressList, residentList, selP, tests) => {
        let allRows = [];
        addressList.forEach(addr => {
            const matchedRes = residentList.find(r => r.address === addr.address);
            allRows.push({ address: addr.address, resident: matchedRes, blockId: addr.blockId });
        });
        residentList.forEach(res => {
            if (!addressList.some(addr => addr.address === res.address)) {
                allRows.push({ address: res.address, resident: res, blockId: res.blockId });
            }
        });

        // 過濾邏輯
        let filteredRows = allRows;
        if (activeTab === 'assigned') filteredRows = allRows.filter(r => r.resident && r.resident.status === 'processed');
        else if (activeTab === 'dispute') filteredRows = allRows.filter(r => r.resident && r.resident.status === 'dispute');
        else if (activeTab === 'unassigned') filteredRows = allRows.filter(r => !r.resident || (r.resident.status !== 'processed' && r.resident.status !== 'dispute'));

        // 更新紅字計數
        const dCount = allRows.filter(r => r.resident && r.resident.status === 'dispute').length;
        document.getElementById('dispute-count').innerText = dCount;

        const currentBlocks = window.store.getBlocks();

        return `
            <table class="responsive-table text-sm">
                <thead><tr><th>地址</th><th>姓名</th><th>電話</th><th>意願</th><th>試水建議</th><th>回饋</th><th style="min-width:120px;">核定街廓</th><th style="min-width:120px;">核定水系</th><th>操作</th></tr></thead>
                <tbody>${filteredRows.map(row => {
            const d = row.resident || { id: 'TMP_' + row.address, name: '', phone: '', willingness: 'none' };
            const rowBlocks = currentBlocks.filter(b => selP === 'all' || b.projectName === selP);
            const currentBlock = currentBlocks.find(b => b.id === (d.blockId || row.blockId));
            const currentBName = currentBlock ? currentBlock.blockName : '';

            const hasTest = !d.id.startsWith('TMP_') && tests.some(t => t.residentId === d.id);
            const latestTest = hasTest ? tests.filter(t => t.residentId === d.id).pop() : null;
            const testResult = latestTest ? latestTest.result : 'none';

            return `
                        <tr>
                            <td data-label="地址"><input type="text" class="edit-addr form-control" value="${row.address}" style="width:120px; padding:4px; font-size:0.8rem;"></td>
                            <td data-label="姓名"><input type="text" class="edit-name form-control" value="${d.name || ''}" placeholder="未登錄" style="width:80px; padding:4px; font-size:0.8rem;"></td>
                            <td data-label="電話"><input type="text" class="edit-phone form-control" value="${d.phone || ''}" placeholder="未填" style="width:100px; padding:4px; font-size:0.8rem;"></td>
                            <td data-label="意願">
                                <select class="edit-will form-control" style="width:80px; padding:4px; font-size:0.8rem;">
                                    <option value="none" ${!d.willingness || d.willingness === 'none' ? 'selected' : ''}>未表達</option>
                                    <option value="front" ${d.willingness === 'front' ? 'selected' : ''}>前巷</option>
                                    <option value="back" ${d.willingness === 'back' ? 'selected' : ''}>後巷</option>
                                    <option value="side" ${d.willingness === 'side' ? 'selected' : ''}>側巷</option>
                                    <option value="no_opinion" ${d.willingness === 'no_opinion' ? 'selected' : ''}>無意見</option>
                                </select>
                            </td>
                            <td data-label="試水建議">
                                <select class="edit-test form-control" style="width:80px; padding:4px; font-size:0.8rem;">
                                    <option value="none" ${testResult === 'none' ? 'selected' : ''}>未試水</option>
                                    <option value="front" ${testResult === 'front' ? 'selected' : ''}>前巷</option>
                                    <option value="back" ${testResult === 'back' ? 'selected' : ''}>後巷</option>
                                    <option value="side_front" ${testResult === 'side_front' ? 'selected' : ''}>側(前)</option>
                                    <option value="side_back" ${testResult === 'side_back' ? 'selected' : ''}>側(後)</option>
                                </select>
                            </td>
                            <td data-label="回饋">${(d.notes || d.photo) ? `<button class="btn btn-outline btn-xs view-feedback" data-id="${d.id}">查看回饋 ${d.photo ? '📷' : ''}</button>` : '無'}</td>
                            <td data-label="核定街廓">
                                <select class="edit-blk-name" data-id="${d.id}" style="width:100%; font-size:0.7rem;">
                                    <option value="">--街廓--</option>
                                    ${[...new Set(rowBlocks.map(b => b.blockName))].sort(naturalSort).map(bn => `<option value="${bn}" ${currentBName === bn ? 'selected' : ''}>${bn}</option>`).join('')}
                                </select>
                            </td>
                            <td data-label="核定水系">
                                <select class="edit-blk-id" data-id="${d.id}" style="width:100%; font-size:0.7rem;">
                                    <option value="">--水系--</option>
                                    ${rowBlocks.filter(b => b.blockName === currentBName).map(b => `<option value="${b.id}" ${(d.blockId || row.blockId) === b.id ? 'selected' : ''}>${b.waterSystem}</option>`).join('')}
                                </select>
                            </td>
                            <td data-label="操作"><button class="btn btn-primary btn-sm save-action" data-id="${d.id}">核定</button></td>
                        </tr>
                    `;
        }).join('')}</tbody>
            </table>
        `;
    };

    const updateAllocationUI = () => {
        const selP = document.getElementById('res-filter-project').value;
        const selB = document.getElementById('res-filter-block').value;

        const currentBlocks = window.store.getBlocks();
        const currentResidents = window.store.getAllResidents();
        const tests = window.store.getData().waterTests || [];

        let filteredAddrs = [];
        currentBlocks.filter(b => (selP === 'all' || b.projectName === selP) && (selB === 'all' || b.blockName === selB)).forEach(blk => {
            filteredAddrs = [...filteredAddrs, ...window.store.getAddressesByBlock(blk.id)];
        });
        const filteredRes = currentResidents.filter(r => (selP === 'all' || r.projectName === selP) && (selB === 'all' || r.blockName === selB));

        document.getElementById('allocation-table-container').innerHTML = renderTable(filteredAddrs, filteredRes, selP, tests);
        lucide.createIcons();

        // 核定下拉連動
        document.querySelectorAll('.edit-blk-name').forEach(sel => {
            sel.onchange = () => {
                const row = sel.closest('tr');
                const waterSel = row.querySelector('.edit-blk-id');
                const filtered = blocks.filter(b => (selP === 'all' || b.projectName === selP) && b.blockName === sel.value);
                waterSel.innerHTML = '<option value="">--水系--</option>' + filtered.map(b => `<option value="${b.id}">${b.waterSystem}</option>`).join('');
            };
        });

        // 查看回饋照片
        document.querySelectorAll('.view-feedback').forEach(btn => {
            btn.onclick = () => {
                const res = currentResidents.find(r => r.id === btn.dataset.id);
                document.getElementById('feedback-content').innerHTML = `
                    <div class="mb-4"><strong>文字備註：</strong><p class="p-3 bg-light mt-2">${res.notes || '無文字備註'}</p></div>
                    ${res.photo ? `<img src="${res.photo}" style="width:100%; border-radius:8px;">` : ''}
                `;
                document.getElementById('feedback-modal').style.display = 'flex';
            };
        });

        // 儲存核定
        document.querySelectorAll('.save-action').forEach(btn => {
            btn.onclick = () => {
                const row = btn.closest('tr');
                const bId = row.querySelector('.edit-blk-id').value;
                const newAddr = row.querySelector('.edit-addr').value;
                const newName = row.querySelector('.edit-name').value;
                const newPhone = row.querySelector('.edit-phone').value;
                const newWill = row.querySelector('.edit-will').value;
                const newTest = row.querySelector('.edit-test').value;

                if (!bId) return alert('請選擇核定水系');

                const id = btn.dataset.id;
                
                // 一次性取得所有資料，進行原子操作
                const allData = window.store.getData();
                const residents = [...(allData.residents || [])];
                let waterTests = [...(allData.waterTests || [])];
                let finalRid = id;

                if (id.startsWith('TMP_')) {
                    const blockObj = currentBlocks.find(b => b.id === bId);
                    const newId = 'R' + Date.now() + Math.random().toString(36).substr(2, 5);
                    residents.push({
                        id: newId,
                        name: newName || '未登錄',
                        phone: newPhone || '未填',
                        address: newAddr,
                        idNumber: 'none',
                        blockId: bId,
                        projectName: blockObj.projectName,
                        blockName: blockObj.blockName,
                        waterSystem: blockObj.waterSystem,
                        willingness: newWill,
                        status: 'processed'
                    });
                    finalRid = newId;
                } else {
                    const idx = residents.findIndex(r => r.id === id);
                    if (idx !== -1) {
                        residents[idx] = { ...residents[idx], name: newName, phone: newPhone, address: newAddr, willingness: newWill, blockId: bId, status: 'processed' };
                    }
                }

                // 處理試水資料（徹底覆蓋模式）
                // 移除該住戶所有舊紀錄
                waterTests = waterTests.filter(t => t.residentId !== finalRid);
                
                if (newTest !== 'none') {
                    waterTests.push({ residentId: finalRid, result: newTest, date: new Date().toISOString() });
                }

                // 一次原子寫入
                window.store.saveData({ ...allData, residents, waterTests });

                alert('核定與資料更新完成');
                updateAllocationUI();
            };
        });
    };

    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.onclick = () => {
            activeTab = tab.dataset.tab;
            document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            updateAllocationUI();
        };
    });

    // 匯入按鈕
    document.getElementById('import-addr-btn').onclick = () => document.getElementById('addr-modal').style.display = 'flex';
    document.getElementById('close-addr-btn').onclick = () => document.getElementById('addr-modal').style.display = 'none';
    document.getElementById('save-addr-btn').onclick = () => {
        const selP = document.getElementById('res-filter-project').value;
        const selB = document.getElementById('res-filter-block').value;
        const currentBlocks = window.store.getBlocks();
        const block = currentBlocks.find(b => b.projectName === selP && b.blockName === selB);
        if (!block) return alert('請先在上方篩選案名與街廓');
        const list = document.getElementById('addr-input').value.split('\n').filter(Boolean);
        window.store.importAddresses(block.id, list);
        alert('匯入完成');
        document.getElementById('addr-modal').style.display = 'none';
        updateAllocationUI();
    };

    // 一鍵儲存按鈕 (改進為原子操作，防止資料覆蓋錯誤)
    document.getElementById('batch-save-btn').onclick = () => {
        const rows = document.querySelectorAll('#allocation-table-container tbody tr');
        if (rows.length === 0) return alert('無可儲存的資料');

        if (!confirm(`確定要將目前列表中所有已選取水系的資料進行批次核定嗎？`)) return;

        const allData = window.store.getData();
        const residents = [...(allData.residents || [])];
        let waterTests = [...(allData.waterTests || [])];
        const currentBlocks = window.store.getBlocks();
        let count = 0;

        rows.forEach(row => {
            const bId = row.querySelector('.edit-blk-id').value;
            if (!bId) return;

            const id = row.querySelector('.save-action').dataset.id;
            const newAddr = row.querySelector('.edit-addr').value;
            const newName = row.querySelector('.edit-name').value;
            const newPhone = row.querySelector('.edit-phone').value;
            const newWill = row.querySelector('.edit-will').value;
            const newTest = row.querySelector('.edit-test').value;

            let finalRid = id;

            if (id.startsWith('TMP_')) {
                const blockObj = currentBlocks.find(b => b.id === bId);
                const newId = 'R' + Date.now() + Math.random().toString(36).substr(2, 5);
                residents.push({
                    id: newId,
                    name: newName || '未登錄',
                    phone: newPhone || '未填',
                    address: newAddr,
                    idNumber: 'none',
                    blockId: bId,
                    projectName: blockObj.projectName,
                    blockName: blockObj.blockName,
                    waterSystem: blockObj.waterSystem,
                    willingness: newWill,
                    status: 'processed'
                });
                finalRid = newId;
            } else {
                const idx = residents.findIndex(r => r.id === id);
                if (idx !== -1) {
                    residents[idx] = { ...residents[idx], name: newName, phone: newPhone, address: newAddr, willingness: newWill, blockId: bId, status: 'processed' };
                }
            }

            // 處理試水資料批次覆蓋
            // 先移除該住戶的所有舊紀錄
            waterTests = waterTests.filter(t => t.residentId !== finalRid);
            
            if (newTest !== 'none') {
                waterTests.push({ residentId: finalRid, result: newTest, date: new Date().toISOString() });
            }
            count++;
        });

        if (count > 0) {
            window.store.saveData({ ...allData, residents, waterTests });
            alert(`已成功批次核定並同步 ${count} 筆資料`);
            updateAllocationUI();
        } else {
            alert('請先為住戶選擇核定水系再進行儲存');
        }
    };

    // 案名與街廓篩選
    const pSel = document.getElementById('res-filter-project');
    const bSel = document.getElementById('res-filter-block');
    const projects = [...new Set(blocks.map(b => b.projectName))].filter(Boolean).sort(naturalSort);
    pSel.innerHTML = '<option value="all">所有案名</option>' + projects.map(p => `<option value="${p}">${p}</option>`).join('');

    pSel.onchange = () => {
        const filtered = pSel.value === 'all' ? blocks : blocks.filter(b => b.projectName === pSel.value);
        bSel.innerHTML = '<option value="all">所有街廓</option>' + [...new Set(filtered.map(b => b.blockName))].sort(naturalSort).map(bn => `<option value="${bn}">${bn}</option>`).join('');
        updateAllocationUI();
    };
    bSel.onchange = updateAllocationUI;

    document.getElementById('close-feedback-btn').onclick = () => document.getElementById('feedback-modal').style.display = 'none';
    updateAllocationUI();

    if (container._storeUpdateHandlerAllocation) {
        window.removeEventListener('storeUpdated', container._storeUpdateHandlerAllocation);
    }
    const storeUpdateHandler = () => {
        if (document.getElementById('allocation-table-container')) {
            updateAllocationUI();
        } else {
            window.removeEventListener('storeUpdated', storeUpdateHandler);
        }
    };
    container._storeUpdateHandlerAllocation = storeUpdateHandler;
    window.addEventListener('storeUpdated', storeUpdateHandler);
};
