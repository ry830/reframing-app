// HTML要素を取得
const recordButton = document.getElementById('recordButton');
const successTextarea = document.getElementById('successTextarea');
const isLuckCheckbox = document.getElementById('isLuck'); // 新しい要素を取得

// 記録した成功を保存する関数
function saveSuccess() {
    const successText = successTextarea.value.trim(); // 前後の空白を削除

    // テキストが空でなければ保存
    if (successText !== '') {
        // 既存のデータを取得
        let successes = JSON.parse(localStorage.getItem('successes') || '[]');

        // 新しい成功を配列に追加
        successes.push({
            text: successText,
            date: new Date().toISOString(),
            isLuck: isLuckCheckbox.checked // チェックボックスの状態を保存
        });

        // localStorageにデータを保存
        localStorage.setItem('successes', JSON.stringify(successes));

        // 記録後にテキストエリアとチェックボックスをクリア
        successTextarea.value = '';
        isLuckCheckbox.checked = false;

        alert('成功を記録しました！'); // 記録完了をユーザーに知らせる
    } else {
        alert('何か入力してください。');
    }
}

// 記録ボタンがクリックされたらsaveSuccess関数を実行
recordButton.addEventListener('click', saveSuccess);