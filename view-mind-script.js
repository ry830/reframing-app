document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------------
    // グローバル変数とDOM要素の取得
    // ------------------------------------
    const mindRecordList = document.getElementById('mindRecordList');
    const clearAllButton = document.getElementById('clearAll');

    // ------------------------------------
    // データ表示と管理のロジック
    // ------------------------------------

    function displayMindRecords() {
        const mindRecords = JSON.parse(localStorage.getItem('mindRecords') || '[]');

        if (!mindRecordList) return; 
        mindRecordList.innerHTML = ''; 

        if (mindRecords.length === 0) {
            mindRecordList.innerHTML = '<p style="text-align:center; color:#888;">まだ思考変換の記録はされていません。</p>';
            if (clearAllButton) clearAllButton.style.display = 'none';
            return;
        }
        if (clearAllButton) clearAllButton.style.display = 'block';

        mindRecords.forEach((item, index) => {
            // データが欠損しているレコードはスキップ（安全対策）
            if (!item || !item.fact || !item.emotion) return; 

            const listItem = document.createElement('li');
            listItem.className = 'mind-record-item';
            
            const date = new Date(item.date);
            const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            let answersHtml = '';
            if (item.answers && item.answers.length > 0) {
                item.answers.forEach((ans, ansIndex) => {
                    // リソース名が日本語になるように調整
                    const label = ['スキル/知恵', '人間関係', '人生の教訓'][ansIndex] || 'その他';
                    const answerText = ans.answer ? ans.answer.replace(/\n/g, '<br>') : '未回答'; 
                    
                    answersHtml += `<div style="font-size: 14px; margin-top: 10px; color: #555;"><strong>${label}という資源:</strong></div>`; 
                    answersHtml += `<div style="font-size: 14px; margin-bottom: 5px; line-height: 1.5; padding-left: 10px; border-left: 3px solid #27ae60; font-weight: 500;">${answerText}</div>`; 
                });
            }
            
            let luckyText = item.luckyAssessment ? {
                'good': '運が良かった (GOOD)',
                'bad': '運が悪かった (BAD)',
                'none': '関係なかった (NONE)'
            }[item.luckyAssessment] || '未選択' : '未記録';

            const factText = item.fact ? item.fact.replace(/\n/g, '<br>') : '記録データ欠損';
            
            // ★修正箇所: AI総評のボタンと非表示コンテナを追加★
            let summaryHtml = '';
            const summaryContentId = `summary-content-${index}`;

            if (item.summary) {
                summaryHtml = `
                    <div style="margin-top: 15px;">
                        <button class="toggle-summary-button" data-target="${summaryContentId}" 
                                style="background-color: #3f51b5; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                            [AI総評] を表示 📝
                        </button>
                        
                        <div id="${summaryContentId}" 
                             style="display: none; padding: 10px; border: 1px solid #c5cae9; border-radius: 4px; background-color: #e8eaf6; font-size: 14px; line-height: 1.6; margin-top: 10px;">
                            ${item.summary.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                `;
            }


            listItem.innerHTML = `
                <div class="date">${formattedDate}</div>
                
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #3498db; margin-bottom: 5px;">【STEP 1: 事実の記録】</h4>
                    <p style="padding-left: 10px; border-left: 3px solid #3498db;">${factText}</p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <h4 style="color: #e74c3c; margin-bottom: 5px;">【STEP 2: 感情の客観視】</h4>
                    <p><strong>湧き出た感情:</strong> ${item.emotion}</p>
                    <p><strong>根源にある考え（思考のクセ）:</strong> ${item.rootThought}</p>
                </div>

                <div style="margin-bottom: 15px;">
                    <h4 style="color: #27ae60; margin-bottom: 5px;">【STEP 3: 意味の再構築（運資源へ）】</h4>
                    ${answersHtml}
                    <p style="font-weight: bold; font-size: 15px; margin-top: 10px;">運の評価: <span style="color: #e74c3c;">${luckyText}</span></p>
                </div>

                ${summaryHtml} <div class="actions" style="margin-top: 10px;">
                    <button class="delete-button" data-index="${index}" style="background-color: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">削除</button>
                </div>
            `;
            mindRecordList.appendChild(listItem);
        });
    }

    // ------------------------------------
    // イベントリスナー（削除機能とトグル機能）
    // ------------------------------------
    if (mindRecordList) {
        mindRecordList.addEventListener('click', (event) => {
            const target = event.target;
            
            // 削除ボタンの処理
            if (target.classList.contains('delete-button')) {
                const index = target.getAttribute('data-index');
                deleteRecord(index);
                return;
            }
            
            // ★AI総評トグルボタンの処理★
            if (target.classList.contains('toggle-summary-button')) {
                const targetId = target.getAttribute('data-target');
                const contentDiv = document.getElementById(targetId);
                
                if (contentDiv) {
                    // 表示/非表示を切り替え
                    const isHidden = contentDiv.style.display === 'none';
                    contentDiv.style.display = isHidden ? 'block' : 'none';
                    
                    // ボタンのテキストを切り替え
                    target.textContent = isHidden ? '[AI総評] を非表示 💡' : '[AI総評] を表示 📝';
                }
            }
        });
    }

    function deleteRecord(index) {
        if (confirm('この記録を削除してもよろしいですか？')) {
            let mindRecords = JSON.parse(localStorage.getItem('mindRecords') || '[]');
            mindRecords.splice(index, 1);
            localStorage.setItem('mindRecords', JSON.stringify(mindRecords));
            displayMindRecords();
        }
    }

    if (clearAllButton) {
        clearAllButton.addEventListener('click', () => {
            if (confirm('すべての記録を削除してもよろしいですか？')) {
                localStorage.removeItem('mindRecords');
                displayMindRecords();
            }
        });
    }

    displayMindRecords(); 
});