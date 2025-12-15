// auth-script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素 ---
    const authTitle = document.getElementById('authTitle');
    const loginFormContainer = document.getElementById('loginFormContainer');
    const registerFormContainer = document.getElementById('registerFormContainer');
    const showRegisterLink = document.getElementById('showRegisterLink');
    const showLoginLink = document.getElementById('showLoginLink');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');

    // サーバー認証用のエンドポイント (Port 3000のバックエンドを参照)
    const AUTH_ENDPOINT = 'http://localhost:3000/api/auth'; 

    // --- ユーティリティ関数 ---
    function showForm(formType) {
        if (formType === 'login') {
            authTitle.textContent = 'ユーザーログイン';
            loginFormContainer.style.display = 'block';
            registerFormContainer.style.display = 'none';
        } else {
            authTitle.textContent = '新規アカウント登録';
            loginFormContainer.style.display = 'none';
            registerFormContainer.style.display = 'block';
        }
        errorMessage.textContent = '';
    }

    function setErrorMessage(message) {
        errorMessage.textContent = message;
    }
    
    // ------------------------------------
    // 新規登録処理 (API連携)
    // ------------------------------------
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setErrorMessage('');
        
        const userId = document.getElementById('registerUserId').value;
        const password = document.getElementById('registerPassword').value;
        
        if (userId.length < 4 || password.length < 6) {
             setErrorMessage('ユーザーIDは4文字以上、パスワードは6文字以上で設定してください。');
             return;
        }

        try {
            const registerButton = document.getElementById('registerButton');
            registerButton.disabled = true;

            const response = await fetch(`${AUTH_ENDPOINT}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password })
            });

            const data = await response.json();
            registerButton.disabled = false; // 処理終了後に解除

            if (!response.ok) {
                // サーバーから返されたエラーメッセージを表示
                throw new Error(data.message || '登録に失敗しました。');
            }

            // 成功: サーバーからトークンを受け取り、保存
            localStorage.setItem('authToken', data.token); // ★トークンを保存
            // ⚠️ currentUserId の保存は無限ループの原因になるため削除またはコメントアウトします。
            // localStorage.setItem('currentUserId', userId); 

            alert(`ユーザーID: ${userId} で登録されました。`);
            // 即座にリダイレクト
            window.location.href = 'index.html';

        } catch (error) {
            const registerButton = document.getElementById('registerButton');
            if (registerButton) registerButton.disabled = false;
            console.error("登録エラー:", error);
            setErrorMessage(`エラー: ${error.message}`);
        }
    });

    // ------------------------------------
    // ログイン処理 (API連携)
    // ------------------------------------
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setErrorMessage('');
        
        const userId = document.getElementById('loginUserId').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const loginButton = document.getElementById('loginButton');
            loginButton.disabled = true;

            const response = await fetch(`${AUTH_ENDPOINT}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password })
            });

            const data = await response.json();
            loginButton.disabled = false; // 処理終了後に解除

            if (!response.ok) {
                throw new Error(data.message || 'ログインに失敗しました。');
            }

            // 成功: サーバーからトークンを受け取り、保存
            localStorage.setItem('authToken', data.token); // ★トークンを保存
            // ⚠️ currentUserId の保存は無限ループの原因になるため削除またはコメントアウトします。
            // localStorage.setItem('currentUserId', userId); 

            // 即座にリダイレクト
            window.location.href = 'index.html';
        } catch (error) {
            const loginButton = document.getElementById('loginButton');
            if (loginButton) loginButton.disabled = false;
            console.error("ログインエラー:", error);
            setErrorMessage(`エラー: ${error.message || 'ユーザーIDまたはパスワードが正しくありません。'}`);
        }
    });

    // --- フォーム切り替えイベントリスナー ---
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showForm('register');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showForm('login');
    });

    // ------------------------------------
    // 初期チェックと初期化 (authTokenのみに依存)
    // ------------------------------------
    showForm('login');
    
    // 既に有効なトークンがあるかチェック
    const authToken = localStorage.getItem('authToken'); 
    if (authToken) {
        // トークンがあれば、無条件でindex.htmlへリダイレクト
        window.location.href = 'index.html';
    }
});