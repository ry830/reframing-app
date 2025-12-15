document.addEventListener('DOMContentLoaded', () => {
    const recordList = document.getElementById('positiveRecordList'); // HTMLのIDはそのまま使用
    const clearAllButton = document.getElementById('clearAll');

    // 記録タイプごとの色分け
    const typeStyles = {
        'positive': { color: '#2ecc71', label: 'ポジティブ日記' },
        'mindRecord': { color: '#3498db', label: '思考変換トレーニング' }
    };

    // ------------------------------------
    // データの読み込みと表示（全記録対応版）
    // ------------------------------------
    function displayAllRecords() {
        // mindRecordsキーにすべての記録が保存されています
        let allRecords = JSON.parse(localStorage.getItem('mindRecords') || '[]');
        
        // 日付が古い順にソート (カレンダー表示に適した順序)
        allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (!recordList) return;
        recordList.innerHTML = '';

        if (allRecords.length === 0) {
            recordList.innerHTML = '<p style="text-align:center; color:#888;">まだ記録はされていません。</p>';
            if (clearAllButton) clearAllButton.style.display = 'none';
            return;
        }

        if (clearAllButton) clearAllButton.style.display = 'block';

        allRecords.forEach((item, index) => {
            // レコードタイプを決定 (typeがない場合は思考変換記録と仮定)
            const recordType = item.type || 'mindRecord'; 
            const style = typeStyles[recordType];
            
            const date = new Date(item.date);
            const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            
            let contentHTML = '';
            let title = '';

            // 記録タイプに応じたコンテンツ生成
            if (recordType === 'positive') {
                const originText = item.origin === 'effort' ? '努力' : (item.origin === 'luck' ? '運' : '未選択');
                title = `🌟 ${item.fact.substring(0, 50)}...`;
                contentHTML = `<p><strong>出来事:</strong> ${item.fact.replace(/\n/g, '<br>')}</p>
                               <p><strong>原因:</strong> ${originText} | <strong>強度:</strong> ${item.intensity}</p>`;
            } else { // 思考変換トレーニングの記録 (mindRecord)
                title = `🔄 ${item.fact.substring(0, 50)}...`;
                contentHTML = `<p><strong>元の事実:</strong> ${item.fact.replace(/\n/g, '<br')}</p>
                               <p><strong>思考のクセ:</strong> ${item.rootThought}</p>
                               <p style="color: ${style.color}; font-weight: bold;">[運資源への転換記録あり]</p>`;
            }
            
            const listItem = document.createElement('li');
            listItem.className = 'record-list-item';
            listItem.style.borderLeft = `5px solid ${style.color}`;

            listItem.innerHTML = `
                <button class="delete-button" data-index="${index}" style="background-color: #e74c3c;">削除</button>
                <h4>${title}</h4>
                <p class="meta-info">種別: ${style.label} | 記録日: ${formattedDate}</p>
                <div class="content-preview">${contentHTML}</div>
            `;
            recordList.appendChild(listItem);
        });
    }

    // ------------------------------------
    // イベントリスナー（全削除と個別の削除ロジック）
    // ------------------------------------
    
    if (recordList) {
        recordList.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('delete-button')) {
                const index = target.getAttribute('data-index');
                deleteRecord(index);
            }
        });
    }

    function deleteRecord(globalIndex) {
        if (!confirm('この記録を削除してもよろしいですか？')) return;

        let allRecords = JSON.parse(localStorage.getItem('mindRecords') || '[]');
        
        // 全体リストから該当アイテムを削除 (インデックスはソートされていない元の配列を参照)
        if (allRecords.length > globalIndex) {
            allRecords.splice(globalIndex, 1);
            localStorage.setItem('mindRecords', JSON.stringify(allRecords));
            displayAllRecords(); // 画面を再描画
            return;
        }
        alert('削除に失敗しました。');
    }

    if (clearAllButton) {
        clearAllButton.addEventListener('click', () => {
            if (confirm('すべての記録を削除してもよろしいですか？')) {
                localStorage.removeItem('mindRecords');
                displayAllRecords();
                alert('すべての記録が削除されました。');
            }
        });
    }

    displayAllRecords();
});