
// positive-script.js

document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------------
    // DOM要素の取得: 変数名をHTMLのIDに合わせて明確にする
    // ------------------------------------
    const positiveFactTextarea = document.getElementById('positiveFactTextarea');
    const originSelect = document.getElementById('originSelect');
    const intensitySelect = document.getElementById('intensitySelect');
    const saveButton = document.getElementById('savePositiveDiaryButton');

    if (saveButton) {
        saveButton.addEventListener('click', () => {
            
            // 値の取得
            const fact = positiveFactTextarea.value.trim(); 
            const origin = originSelect.value;
            const intensity = intensitySelect.value;

            if (fact === '') {
                alert('具体的な出来事を記録してください。');
                return;
            }
            if (origin === '') {
                alert('原因（努力か運か）を選択してください。');
                return;
            }

            // 1. 永続保存のための newRecord 構築
            const newRecord = {
                // idはsaveRecord内で付与されるため削除
                type: 'positive', // 記録の種類を識別
                date: new Date().toISOString(),
                fact: fact, 
                origin: origin, // effort または luck
                intensity: intensity // low, medium, high
            };

            try {
                // ★★★ 共通関数 saveRecord を利用 ★★★
                // saveRecordは、ログインチェック、UserId付与、LocalStorage保存を全て担当します
                const isSaved = saveRecord(newRecord);

                if (!isSaved) {
                    // saveRecord内でアラートが出るはずだが、念のため
                    console.error("保存失敗: saveRecord関数がfalseを返しました。");
                    return;
                }
                
                console.log('✅ ポジティブ日記が正常に保存されました。');

                alert('ポジティブ日記の記録を完了しました！');
                
                // 画面をリセット
                positiveFactTextarea.value = '';
                originSelect.value = '';
                intensitySelect.value = 'medium';
                
            } catch (error) {
                console.error("データの保存中にエラーが発生しました:", error);
                alert('エラーが発生しました。記録は保存されていません。');
            }
        });
    }
});