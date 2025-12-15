// view-record-unified-script.js のファイルの先頭に追加

function toYMD_Local(isoString) {
    if (!isoString) return null;

    const dateObj = new Date(isoString);

    // ローカルタイム基準で年、月、日を取得
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

///////////////////////////////////////////////

document.addEventListener('DOMContentLoaded', async () => {
    // ------------------------------------
    // グローバル変数とDOM要素の取得
    // ------------------------------------
    const mindRecordList = document.getElementById('mindRecordList');
    const positiveRecordList = document.getElementById('positiveRecordList');
    const meditationRecordList = document.getElementById('meditationRecordList');
    const clearAllButton = document.getElementById('clearAll');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // 記録タイプごとの色分けとラベル
    const typeStyles = {
        'positive': { color: '#2ecc71', label: 'ポジティブ日記', className: 'positive-record' },
        'mindRecord': { color: '#3498db', label: '思考変換トレーニング', className: 'mind-record' },
        'meditation': { color: '#9c27b0', label: '瞑想トレーニング', className: 'meditation-record' }
    };

    // ------------------------------------
    // データの読み込みと表示
    // ------------------------------------
    
    // displayRecords 関数をグローバルスコープから移動
    async function displayRecords() {
        // 共通関数getRecords()でログインユーザーの全記録を取得
        // ⚠️ getRecords() の中で 'authtoken' 参照エラーが発生している可能性が高いため、
        // ⚠️ 外部のファイル (script.jsなど) の getRecords() 関数を修正する必要があります。
        let allRecords = await getRecords();

        // ⚠️ 修正: allRecords が配列であることを保証
    if (!Array.isArray(allRecords)) {
        console.warn("getRecords() が配列を返しませんでした。");
        allRecords = [];
    }

        // ------------------------------------
        // 日付フィルタリングのロジック
        // ------------------------------------
        const filterDate = localStorage.getItem('filterDate');
        let isFiltered = false;
        let filteredRecords = allRecords;
        let displayDateString = '全期間'; // ヘッダー表示用

        if (filterDate) {
            filteredRecords = allRecords.filter(r => {
                if (r.date) {
                    // YYYY-MM-DD形式で日付が一致するかチェック
                    // ★修正: toYMD_Local を使用して、記録の日付をJST基準に変換
                    return toYMD_Local(r.date) === filterDate;
                }
                return false;
            });
            isFiltered = true;

            const [year, month, day] = filterDate.split('-').map(Number);
            const localDate = new Date(year, month - 1, day); 
            
            displayDateString = `${localDate.getFullYear()}年 ${localDate.getMonth() + 1}月 ${localDate.getDate()}日の記録`; 
        }
        // ------------------------------------
        
        // 日付が新しい順にソート
        filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        // タブごとに記録を分離
        const mindRecords = filteredRecords.filter(r => r.type === 'mindRecord' || (!r.type && r.emotion && r.rootThought));
        const positiveRecords = filteredRecords.filter(r => r.type === 'positive');
        const meditationRecords = filteredRecords.filter(r => r.type === 'meditation');

        // 記録リストの描画
        renderRecords(mindRecordList, mindRecords, allRecords, isFiltered);
        renderRecords(positiveRecordList, positiveRecords, allRecords, isFiltered);
        renderRecords(meditationRecordList, meditationRecords, allRecords, isFiltered);

        // フィルタリング表示のメッセージを更新
        if (isFiltered) {
            document.querySelector('.unified-view-container h1').textContent = ` 記録の振り返り (${displayDateString})`;
            document.querySelector('.unified-view-container p').textContent = 'カレンダーから選択された日付の記録を表示しています。';
        } else {
            document.querySelector('.unified-view-container h1').textContent = ` 記録の振り返り (全期間)`;
            document.querySelector('.unified-view-container p').textContent = 'これまでの心の筋トレの記録を振り返りましょう。';
        }
        
        // フィルタリング完了後、LocalStorageから日付をクリア
        localStorage.removeItem('filterDate');
    }

// view-records-unified-script.js の renderRecords 関数
function renderRecords(listElement, records, allRecords, isFiltered) {
    if (!listElement) return;
    listElement.innerHTML = '';
    
    // リストIDから現在のレコードタイプを判定
    let typeKey;
    if (listElement.id === 'positiveRecordList') {
        typeKey = 'positive';
    } else if (listElement.id === 'meditationRecordList') {
        typeKey = 'meditation';
    } else {
        typeKey = 'mindRecord';
    }
    
    const style = typeStyles[typeKey]; // デフォルトスタイル

    if (records.length === 0) {
        const message = isFiltered ? `この日付の ${style.label} の記録はありません。` : `${style.label} の記録はまだありません。`;
        listElement.innerHTML = `<p style="text-align:center; color:#888;">${message}</p>`;
        return;
    }

    records.forEach((item) => {
        const currentType = item.type || 'mindRecord'; 
        const currentStyle = typeStyles[currentType] || typeStyles['mindRecord'];

        const listItem = document.createElement('li');
        listItem.className = `record-list-item ${currentStyle.className}`;
        
        const date = new Date(item.date);
        const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        
        let contentHTML = '';
        let title = '';

        const factContent = item.fact && typeof item.fact === 'string' ? item.fact : '出来事の記録なし';

        if (currentType === 'positive') {
            const originText = item.origin === 'effort' ? '努力・行動' : (item.origin === 'luck' ? '運・他者要因' : '未選択');
            
            // ★★★ 修正点: 強度を英語から日本語に変換 ★★★
            let intensityText;
            switch(item.intensity) {
                case 'low': intensityText = '小'; break;
                case 'medium': intensityText = '中'; break;
                case 'high': intensityText = '大'; break;
                default: intensityText = '未記録';
            }
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

            title = `🌟 ${factContent.substring(0, 50)}${factContent.length > 50 ? '...' : ''}`;
            
            contentHTML = `<p><strong>出来事:</strong> ${factContent.replace(/\n/g, '<br>')}</p>
                           <p><strong>原因:</strong> ${originText} | <strong>強度:</strong> ${intensityText}</p>`;
        } else if (currentType === 'meditation') { 
            const minutes = Math.floor(item.duration / 60);
            const seconds = item.duration % 60;
            const durationText = `${minutes}分${String(seconds).padStart(2, '0')}秒`;
            
            let mindsetText = '';
            switch(item.mindset) {
                case 'very_calm': mindsetText = '非常に穏やか (5)'; break;
                case 'calm': mindsetText = '穏やか (4)'; break;
                case 'normal': mindsetText = '普通 (3)'; break;
                case 'restless': mindsetText = '少し落ち着かない (2)'; break;
                case 'very_restless': mindsetText = '非常に落ち着かない (1)'; break;
                default: mindsetText = '未記録';
            }

            title = `🧘 瞑想完了 (${durationText})`;

            contentHTML = `<p><strong>完了時間:</strong> <span style="font-weight: bold; color: ${currentStyle.color};">${durationText}</span></p>
                           <p><strong>瞑想後の心の状態:</strong> ${mindsetText}</p>`;
        } else { // ★★★ 思考変換トレーニングの描画ロジック ★★★
            
            // 資源回答を安全に取得
            const getAnswer = (type) => {
                const answerObj = item.answers ? item.answers.find(a => a.type === type) : null;
                return answerObj ? (answerObj.answer || '未記録') : '未記録';
            };
            
            // ★★★ 最終評価を日本語に変換するためのマップ ★★★
            const thoughtAssessmentMap = {
                'bad_to_positive': '運が悪いと思っていたが、少しポジティブになれた気がした',
                'bad_to_negative': '運が悪いと思っていた、やはり辛いままだ',
                'neutral_to_positive': '運とは関係ない出来事だったが、少しポジティブになれた気がした',
                'neutral_to_neutral': '運とは関係ない出来事だった、特に何も感じなかった',
                'neutral_to_negative': '運とは関係ない出来事だったが、やはり辛いままだ',
                'good_to_more_positive': '運が良かった出来事だった、さらにポジティブになれた気がした',
                'good_to_anxious': '運が良かった出来事だったが、この先悪いことが起きるのではないかと不安だ'
            };
            
            const finalAssessmentKey = item.thoughtAssessment || '';
            const finalAssessmentText = thoughtAssessmentMap[finalAssessmentKey] || '未記録';
            
            title = `🔄 ${factContent.substring(0, 50)}${factContent.length > 50 ? '...' : ''}`;
            
            contentHTML = `
                <p style="margin-bottom: 5px;"><strong>元の事実:</strong> ${factContent.replace(/\n/g, '<br>')}</p>
                <p style="margin-bottom: 5px;"><strong>湧き出た感情:</strong> ${item.emotion || '未記録'}</p>
                <p style="margin-bottom: 5px;"><strong>思考のクセ:</strong> ${item.rootThought || '未記録'}</p>
                <hr style="margin: 10px 0; border-top: 1px dashed #ddd;">
                
                <p style="font-weight: bold; margin-bottom: 0;"> スキルへの変換:</p>
                <p style="padding-left: 10px; margin-top: 0; margin-bottom: 10px;">${getAnswer('skill').replace(/\n/g, '<br>')}</p>

                <p style="font-weight: bold; margin-bottom: 0;"> 人間関係への変換:</p>
                <p style="padding-left: 10px; margin-top: 0; margin-bottom: 10px;">${getAnswer('relation').replace(/\n/g, '<br>')}</p>

                <p style="font-weight: bold; margin-bottom: 0;"> 教訓への変換:</p>
                <p style="padding-left: 10px; margin-top: 0; margin-bottom: 15px;">${getAnswer('lesson').replace(/\n/g, '<br>')}</p>
                
                <hr style="margin: 10px 0; border-top: 1px solid #ccc;">
                
                <button 
                    class="ai-summary-toggle-button button-primary" 
                    data-target="ai-summary-${item.id}"
                    style="margin-top: 15px; padding: 5px 15px; background-color: #fbc02d; color: #333; font-size: 0.9rem;">
                    🤖 AI総評を見る
                </button>
                
                <div id="ai-summary-${item.id}" class="ai-summary-area" style="display: none; border-left: 5px solid #fbc02d; background-color: #fffde7; padding: 10px; margin-top: 10px;">
                    <strong>🤖 AI総評:</strong><br>
                    ${(item.summary || 'AI総評はまだ生成されていません。').replace(/\n/g, '<br>')}
                </div>
            `;
        }
        
        const recordId = item._id || item.id; // ★★★ 修正: MongoDBのID (_id) を優先 ★★★

        listItem.innerHTML = `
            <button class="delete-button" data-record-id="${recordId}">削除</button>
            <h4>${title}</h4>
            <p class="meta-info">種別: ${currentStyle.label} | 記録日: ${formattedDate}</p>
            <div class="content-details">${contentHTML}</div>
        `;
        listElement.appendChild(listItem);
    });
    
    // ★★★ 折りたたみボタンのイベントリスナー ★★★
    document.querySelectorAll('.ai-summary-toggle-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.target.dataset.target;
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const isHidden = targetElement.style.display === 'none';
                targetElement.style.display = isHidden ? 'block' : 'none';
                e.target.textContent = isHidden ? '🤖 AI総評を隠す' : '🤖 AI総評を見る';
            }
        });
    });
}


    // ------------------------------------
    // タブ切り替えロジック (変更なし)
    // ------------------------------------
    function activateTab(tabId) {
        tabButtons.forEach(button => button.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        const activeContent = document.getElementById(tabId);

        if (activeButton) activeButton.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            activateTab(tabId);
        });
    });

    // ------------------------------------
    // 削除ロジック (API連携)
    // ------------------------------------
    [mindRecordList, positiveRecordList, meditationRecordList].forEach(list => {
    if (list) {
        list.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('delete-button')) {
                const recordId = target.getAttribute('data-record-id');
                
                if (!recordId || recordId === 'undefined') {
                    console.error("エラー: 削除するレコードIDが見つかりません。");
                    return;
                }
                
                deleteRecordWrapper(recordId);
                }
            });
        }
    });

    // 削除ラッパー関数 (API連携のため async にする必要がある)
    async function deleteRecordWrapper(recordId) { 
    if (!confirm('この記録を削除してもよろしいですか？')) {
    return;
}
        
        // ⚠️ deleteRecord(recordId) 関数が外部ファイルで定義されている必要があります。
        const success = await deleteRecord(recordId); 

        if (success) {
            // サーバーから削除成功後、画面を再描画
            await displayRecords(); 
            // 成功アラートは deleteRecord 関数内で行われていると仮定
        } else {
            alert('記録の削除に失敗しました。');
        }
    }



// ------------------------------------
// 全削除ロジック
// ------------------------------------
if (clearAllButton) {
    clearAllButton.addEventListener('click', async () => { // ★asyncを追加★
        if (confirm('!!警告!! すべての記録を削除してもよろしいですか？（非推奨）')) {
            try {
                // 認証トークンを取得
                const authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    alert('認証情報がありません。ログインしてください。');
                    return;
                }

                // 新しい API エンドポイントを呼び出す
                const response = await fetch('http://localhost:3000/api/records/clear-all', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'サーバーからの応答エラー');
                }

                // 成功時
                const data = await response.json();
                
                // ★LocalStorage の古いデータもクリア (念のため)★
                localStorage.removeItem('mindRecords'); 
                
                alert(`すべての記録を削除しました。（${data.deletedCount} 件）`);
                await displayRecords(); // 画面を再描画
            } catch (error) {
                console.error("全記録削除APIエラー:", error);
                alert(`すべての記録の削除に失敗しました。\nエラー: ${error.message}`);
            }
        }
    });
}

    // 初期化
    // ページロード時にすべての記録を表示
    await displayRecords();
    // 思考変換タブを初期アクティブにする
    activateTab('mind-tab');
});


// -------------------------------------------------------------
// ⚠️ 重要な指示 ⚠️
// 以下のエラーを直すには、外部のファイルを修正する必要があります。
// ReferenceError: authtoken is not defined
//
// [修正が必要なファイル]: script.js (または getRecords関数が定義されているファイル)
//
// そのファイルを開き、getRecords 関数内のトークン取得部分を修正してください:
/*
async function getRecords() {
    // 変更前: const authToken = authtoken; // <-- 間違い
    const authToken = localStorage.getItem('authToken'); // <-- 正しい修正
    
    if (!authToken) { ... }
    // ...
}
*/
// -------------------------------------------------------------