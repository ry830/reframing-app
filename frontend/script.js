// script.js
// クラウド連携用の非同期データ操作ロジック
// 
// ⚠️ このコードはバックエンドAPIのURLと認証トークンの仕組みを前提とします。
// 実際の利用には、バックエンドサーバーの構築が必要です。

const BASE_API_URL = 'https://reframing-app-api.onrender.com/api'; // 構築するサーバーのURLに置き換える
const RECORD_ENDPOINT = `${BASE_API_URL}/records`;
const AUTH_ENDPOINT = `${BASE_API_URL}/auth`;

/**
 * 現在の認証トークンを取得する（未実装のサーバー認証機能を前提）
 * @returns {string | null}
 */
function getAuthToken() {
    // 認証APIが返すJWTなどのトークンをLocalStorageから取得することを想定
    return localStorage.getItem('authToken');
}

// ------------------------------------------------------------------

/**
 * 記録をAPIサーバーに送信し、保存する
 * @param {object} newRecord - 保存する新しい記録オブジェクト
 * @returns {Promise<boolean>} - 保存成功の可否
 */
async function saveRecord(newRecord) {
    const token = getAuthToken();

    if (!token) {
        alert('セッションが切れました。再度ログインしてください。');
        window.location.href = 'auth.html';
        return false;
    }

    try {
        const response = await fetch(`${RECORD_ENDPOINT}/save`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // 認証トークンを送信
            },
            body: JSON.stringify(newRecord)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '記録の保存に失敗しました');
        }

        // ログの記録はサーバー側で行われるため、クライアント側での追加処理は不要

        return true;
    } catch (e) {
        console.error("記録の保存中にエラーが発生しました:", e);
        alert(`記録保存エラー: ${e.message}`);
        return false;
    }
}

// ------------------------------------------------------------------

/**
 * ログインユーザーの記録をAPIサーバーから取得する
 * @returns {Promise<Array<object>>} - ログインユーザーの記録の配列
 */
// script.js 内の getRecords 関数

// script.js 内の getRecords 関数

async function getRecords() {
    // 1. トークンを localStorage から確実に取得
    const authToken = localStorage.getItem('authToken'); 

    // 2. トークンがない場合の処理。
    if (!authToken) { 
        return []; // ⚠️ 修正: トークンがない場合は、空の配列を返す！
    }

    try {
        const response = await fetch(`${RECORD_ENDPOINT}/get`, {
            method: 'GET',
            headers: {
                // 3. 認証ヘッダーで authToken を使用
                'Authorization': `Bearer ${authToken}` 
            }
        });

        const data = await response.json();

        if (response.status === 401) {
            localStorage.removeItem('authToken');
            window.location.href = 'auth.html';
            return []; // ⚠️ 修正: エラー時も空の配列を返す
        }

        if (!response.ok) {
            throw new Error(data.message || '記録の取得に失敗しました。');
        }

        // ⚠️ 修正箇所: サーバーの応答が { records: [...] } 形式の場合に対応
        if (data && Array.isArray(data.records)) {
            return data.records; // ★配列である 'records' プロパティを返す★
        } else if (Array.isArray(data)) {
            return data; // サーバーが直接配列を返した場合
        } else {
            // サーバーの応答が予期せぬ形式だった場合
            console.error("サーバーから予期しない形式のデータが返されました:", data);
            return [];
        }

    } catch (error) {
        console.error("記録の読み込み中にエラーが発生しました:", error);
        return []; // ⚠️ 修正: エラー時も空の配列を返す
    }
}

// ------------------------------------------------------------------

/**
 * ログインユーザーの記録をIDでAPIサーバー経由で削除する
 * @param {number} recordId - 削除する記録のID
 * @returns {Promise<boolean>} - 削除成功の可否
 */
async function deleteRecord(recordId) {
    const token = getAuthToken();
    if (!token) return false;


    try {
        const response = await fetch(`${RECORD_ENDPOINT}/delete/${recordId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}` 
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '記録の削除に失敗しました');
        }

        alert('記録を削除しました。');
        return true;

    } catch (e) {
        console.error("記録の削除中にエラーが発生しました:", e);
        alert(`削除エラー: ${e.message}`);
        return false;
    }
}