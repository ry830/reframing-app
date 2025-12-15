document.addEventListener('DOMContentLoaded', () => {
    
    
    // ------------------------------------
    // DOM要素と定数
    // ------------------------------------
    const postContent = document.getElementById('postContent');
    const submitPostButton = document.getElementById('submitPostButton');
    const postListElement = document.getElementById('postList');
    // ★★★ 追加: 通知・マイページ関連DOM ★★★
    const notificationButton = document.getElementById('notificationButton');
    const notificationMenu = document.getElementById('notificationMenu');
    const notificationBadge = document.getElementById('notificationBadge');
    const notificationListElement = document.getElementById('notificationList');
    const markAllReadButton = document.getElementById('markAllReadButton');
    const mypageButton = document.getElementById('mypageButton');
    const mypageMenu = document.getElementById('mypageMenu');
    const myCommunityPostsLink = document.getElementById('myCommunityPostsLink');

    
    // ログインユーザーIDを取得
    const currentUserId = localStorage.getItem('currentUserId');
    
    if (!currentUserId) {
        alert('ログインしてください。');
        window.location.href = 'auth.html';
        return;
    }

    // HTMLエスケープ (セキュリティ確保のため)
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[match];
        });
    }

    // ------------------------------------
    // 擬似API層 (LocalStorageベースのデータ操作)
    // ------------------------------------

    function getDB() {
        try {
            return JSON.parse(localStorage.getItem('communityPosts') || '[]').map(post => ({
                ...post,
                id: Number(post.id)
            }));
        } catch (e) {
            return [];
        }
    }
    function saveDB(posts) {
        localStorage.setItem('communityPosts', JSON.stringify(posts));
    }

    // ★★★ 追加: 通知DB操作 ★★★
    function getNotificationDB() {
        try {
            return JSON.parse(localStorage.getItem('userNotifications') || '[]');
        } catch (e) {
            return [];
        }
    }
    function saveNotificationDB(notifications) {
        localStorage.setItem('userNotifications', JSON.stringify(notifications));
    }

// ★★★ 追加: ユーザー情報DB操作 ★★★
function getUsersDB() {
    try {
        return JSON.parse(localStorage.getItem('userProfiles') || '{}');
    } catch (e) {
        return {};
    }
}
function saveUsersDB(profiles) {
    localStorage.setItem('userProfiles', JSON.stringify(profiles));
}

// ユーザーのニックネームを取得
function getUserNickname(userId) {
    const profiles = getUsersDB();
    // ニックネームがなければ '匿名ニックネーム' をデフォルトとして使用
    return profiles[userId] ? profiles[userId].nickname : '匿名ニックネーム';
}

// ユーザーのニックネームを設定
async function setUserName(userId, newNickname) {
    const profiles = getUsersDB();
    if (!profiles[userId]) {
        profiles[userId] = {};
    }
    profiles[userId].nickname = newNickname;
    saveUsersDB(profiles);
    return await simulateAPI({ success: true });
}

// ... (toggleEmpathy 関数へ続く)


    const simulateAPI = (data) => new Promise(resolve => setTimeout(() => resolve(data), 200));

    async function fetchPosts() {
        const posts = getDB();
        return await simulateAPI(posts);
    }
    
    // ★★★ 修正: 投稿時に通知を生成しない（投稿は自分宛の通知ではないため） ★★★
    async function createPost(content) {
        const posts = getDB();
        
        const newPost = {
            id: Date.now(),
            userId: currentUserId,
            content: content,
            date: new Date().toISOString(),
            empathyCount: 0,
            empathyUsers: [],
            isAnonymous: true,
            comments: [] 
        };

        posts.push(newPost);
        saveDB(posts);
        
        return await simulateAPI(newPost);
    }

    // ★★★ 修正: 共感操作後に通知を生成する ★★★
    async function toggleEmpathy(postId) {
        const posts = getDB();
        const post = posts.find(p => p.id === postId);

        if (!post) throw new Error("Post not found");

        const userEmpathized = post.empathyUsers.includes(currentUserId);

        if (userEmpathized) {
            post.empathyUsers = post.empathyUsers.filter(id => id !== currentUserId);
            post.empathyCount = (post.empathyCount || 0) - 1;
        } else {
            post.empathyUsers.push(currentUserId);
            post.empathyCount = (post.empathyCount || 0) + 1;
            
            // ★★★ 通知生成: 投稿者本人でなければ通知を生成 ★★★
            if (post.userId !== currentUserId) {
                generateNotification(post.userId, currentUserId, 'empathy', postId);
            }
        }

        saveDB(posts);
        return await simulateAPI({ empathyCount: post.empathyCount, userEmpathized: !userEmpathized });
    }

    // ★★★ 修正: コメント操作後に通知を生成する ★★★
    async function addComment(postId, text) {
        const posts = getDB();
        const post = posts.find(p => p.id === postId);

        if (!post) throw new Error("Post not found");
        if (!post.comments) post.comments = [];

        const newComment = {
            commentId: Date.now(),
            commenterId: currentUserId,
            text: text,
            createdAt: new Date().toISOString()
        };

        post.comments.push(newComment);
        saveDB(posts);
        
        // ★★★ 通知生成: 投稿者本人でなければ通知を生成 ★★★
        if (post.userId !== currentUserId) {
            generateNotification(post.userId, currentUserId, 'comment', postId);
        }

        return await simulateAPI(post);
    }

    async function toggleAnonymity(postId, isAnonymous) {
        const posts = getDB();
        const post = posts.find(p => p.id === postId);

        if (!post) throw new Error("Post not found");
        
        if (post.userId !== currentUserId) {
            throw new Error("本人以外は匿名性を変更できません。");
        }

        post.isAnonymous = isAnonymous;
        saveDB(posts);
        
        return await simulateAPI(post);
    }
    
    // ★★★ 投稿削除API (変更なし) ★★★
    async function deletePost(postId) {
        let posts = getDB();
        const postIndex = posts.findIndex(p => p.id === postId);

        if (postIndex === -1) throw new Error("Post not found");
        
        // 投稿者本人であることを確認
        if (posts[postIndex].userId !== currentUserId) {
            throw new Error("本人以外は投稿を削除できません。");
        }

        posts.splice(postIndex, 1);
        saveDB(posts);
        
        return await simulateAPI({ success: true });
    }

    // ★★★ コメント削除API (変更なし) ★★★
    async function deleteComment(postId, commentId) {
        const posts = getDB();
        const post = posts.find(p => p.id === postId);

        if (!post) throw new Error("Post not found");
        if (!post.comments) throw new Error("Comment list not found");

        const commentIndex = post.comments.findIndex(c => c.commentId === commentId);

        if (commentIndex === -1) throw new Error("Comment not found");
        
        // コメント投稿者本人であることを確認
        if (post.comments[commentIndex].commenterId !== currentUserId) {
            throw new Error("本人以外はコメントを削除できません。");
        }
        
        post.comments.splice(commentIndex, 1);
        saveDB(posts);

        return await simulateAPI({ success: true });
    }

    // ★★★ 追加: 通知の操作API ★★★
    async function fetchNotifications() {
        const allNotifications = getNotificationDB();
        // 自分宛ての通知のみをフィルタリング
        const userNotifications = allNotifications.filter(n => n.recipientId === currentUserId);
        // 新しい順にソート
        userNotifications.sort((a, b) => new Date(b.date) - new Date(a.date)); 
        return await simulateAPI(userNotifications);
    }

    // 通知を生成して保存
    function generateNotification(recipientId, senderId, type, postId) {
        const notifications = getNotificationDB();
        const newNotification = {
            id: Date.now(),
            recipientId: recipientId,
            senderId: senderId,
            type: type, // 'empathy' or 'comment'
            postId: postId,
            date: new Date().toISOString(),
            isRead: false
        };
        notifications.push(newNotification);
        saveNotificationDB(notifications);
        updateNotificationBadge(); // 通知生成後にバッジを更新
    }
    
    // 特定の通知を既読にする
    function markNotificationAsRead(notificationId) {
        const notifications = getNotificationDB();
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.isRead = true;
            saveNotificationDB(notifications);
            updateNotificationBadge();
        }
    }
    
    // 全ての通知を既読にする
    function markAllNotificationsAsRead() {
        const notifications = getNotificationDB();
        notifications.forEach(n => {
            if (n.recipientId === currentUserId) {
                n.isRead = true;
            }
        });
        saveNotificationDB(notifications);
        updateNotificationBadge();
    }


    // ------------------------------------
    // 描画機能
    // ------------------------------------

    // コメント描画関数 (変更なし)
    function renderComments(comments, postId) { 
        if (!comments || comments.length === 0) {
            return '<p class="no-comment">まだコメントがありません。</p>';
        }

        let commentsHtml = comments.map(comment => {
        // コメントは匿名での入力が前提ですが、ここではIDではなくニックネームを取得して表示します
        const nickname = getUserNickname(comment.commenterId);
        const commenter = comment.commenterId === currentUserId ? 'あなた' : nickname; // ニックネームを使用
        const commentDate = new Date(comment.createdAt).toLocaleString('ja-JP', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
            }); 
            
            // 自分のコメントにのみ削除ボタンを追加
            const isCommentOwner = comment.commenterId === currentUserId;
            const deleteCommentButton = isCommentOwner 
                ? `<button class="delete-comment-button" data-post-id="${postId}" data-comment-id="${comment.commentId}" style="color: #e74c3c; background: none; border: none; cursor: pointer; font-size: 0.8em; padding: 0;">[削除]</button>`
                : '';
            
            return `
                <div class="comment-item" style="display: flex; align-items: baseline; gap: 5px; margin-bottom: 5px;">
                    <span class="comment-user">👤 ${commenter}:</span>
                    <span class="comment-text">${escapeHtml(comment.text)}</span>
                    <span class="comment-date" style="color: #777; font-size: 0.9em;">(${commentDate})</span>
                    ${deleteCommentButton}
                </div>
            `;
        }).join('');

        return `<div class="comment-list">${commentsHtml}</div>`;
    }

    async function renderPosts() {
        const posts = await fetchPosts();
        
        if (posts.length === 0) {
            postListElement.innerHTML = '<p style="text-align: center; color: #888;">まだ誰も投稿していません。</p>';
            return;
        }

        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        postListElement.innerHTML = '';

        posts.forEach(post => {
            const postItem = document.createElement('div');
            postItem.className = 'post-item compact-item';


            const isOwner = post.userId === currentUserId;
            // ★★★ 修正箇所: ニックネームを取得して表示に利用 ★★★
            let userDisplay = post.userId;
            if (!post.isAnonymous) {
                // 匿名でない場合、ニックネームを取得
                userDisplay = getUserNickname(post.userId);
            }

            const displayUserId = post.isAnonymous ? '匿名ユーザー' : userDisplay; // ニックネームまたはIDを使用
            
            const displayOwner = isOwner ? `<span style="color: #4CAF50;">(あなた)</span>` : '';
            
            const postDate = new Date(post.date).toLocaleString('ja-JP', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
            });
            
            const userEmpathized = post.empathyUsers && post.empathyUsers.includes(currentUserId);
            
            // 投稿者本人のみに表示される匿名解除ボタン
            let anonymityButton = '';
            if (isOwner) {
                const currentStatusText = post.isAnonymous ? '匿名中' : '実名公開中';
                const nextActionText = post.isAnonymous ? '実名公開へ' : '匿名化へ';
                
                anonymityButton = `
                    <button class="anonymity-toggle-button" 
                            data-post-id="${post.id}" 
                            data-is-anonymous="${post.isAnonymous}"
                            style="background-color: #9b59b6; color: white; padding: 5px 10px; border-radius: 5px; border: none; font-size: 0.9em; cursor: pointer;">
                        🔑 ${currentStatusText}（${nextActionText}）
                    </button>
                `;
            }
            
            // 投稿者本人のみに表示される削除ボタン
            let deleteButton = '';
            if (isOwner) {
                deleteButton = `<button class="delete-post-button" data-post-id="${post.id}" style="color: #e74c3c; background: none; border: none; cursor: pointer; font-size: 0.9em; padding: 0;">[削除]</button>`;
            }
            
            const commentsHtml = renderComments(post.comments, post.id);
            const commentInputId = `commentInput-${post.id}`;
            const commentSubmitId = `commentSubmit-${post.id}`;

            postItem.innerHTML = `
                <div class="post-header" style="margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                    <span class="user-id-display" style="font-size: 1.1em;">👤 ${displayUserId} ${displayOwner}</span>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${anonymityButton}
                        <span style="font-size: 0.9em; color: #777;">${postDate}</span>
                        ${deleteButton}
                    </div>
                </div>

                <div class="post-item-content" style="
                    font-size: 1.8rem; 
                    font-weight: 400; 
                    line-height: 1.6; 
                    margin-bottom: 10px; 
                    padding: 5px 10px; 
                    min-height: 40px; 
                    border-left: 5px solid #9c27b0; 
                    background-color: #fcfcfc;
                    text-align: left; 
                    display: block; 
                    white-space: normal;">
                    ${escapeHtml(post.content)}
                </div>

                <div class="post-meta" style="border-top: 1px solid #eee; padding-top: 8px; margin-bottom: 8px;">
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <button class="empathy-button" data-post-id="${post.id}" style="font-size: 1.1em;">
                            ${userEmpathized ? '❤️ 共感済み' : '🤍 共感する'}
                        </button>
                        <span class="empathy-count" id="count-${post.id}">${post.empathyCount || 0}</span>
                    </div>
                </div>

                <div class="comment-container">
                    <div id="comments-${post.id}" style="margin-bottom: 10px;">
                        ${commentsHtml}
                    </div>
                    
                    <div class="comment-form" style="display: flex; gap: 10px; border-top: 1px dashed #ddd; padding-top: 8px;">
                        <input type="text" id="${commentInputId}" placeholder="コメントを入力（匿名）" class="comment-input" style="flex-grow: 1;">
                        <button id="${commentSubmitId}" data-post-id="${post.id}" class="comment-submit-button button-primary" style="background-color: #5c6bc0; padding: 8px 15px;">コメント</button>
                    </div>
                </div>
            `;
            postListElement.appendChild(postItem);

            // コメント送信ボタンのイベントリスナーはここで設定
            document.getElementById(commentSubmitId).addEventListener('click', handleCommentSubmit); 
        });

        // 投稿表示が完了したら、全ボタンのイベントリスナーを設定
        setupPostListeners();
    }
    
    // ★★★ 追加: 通知バッジの更新 ★★★
    async function updateNotificationBadge() {
        const notifications = await fetchNotifications();
        const unreadCount = notifications.filter(n => !n.isRead).length;

        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    // ★★★ 追加: 通知リストの描画 ★★★
    async function renderNotifications() {
        const notifications = await fetchNotifications();
        
        notificationListElement.innerHTML = '';

        if (notifications.length === 0) {
            notificationListElement.innerHTML = '<p class="no-notifications">新しい通知はありません。</p>';
            markAllReadButton.style.display = 'none';
            return;
        }
        
        markAllReadButton.style.display = 'block';

        notifications.forEach(n => {
            const item = document.createElement('div');
            item.className = `notification-item ${n.isRead ? '' : 'unread'}`;
            item.dataset.notificationId = n.id;
            item.dataset.postId = n.postId; // 該当投稿にジャンプするために利用

            const actionText = n.type === 'empathy' ? '共感' : 'コメント';
            const sender = n.senderId === currentUserId ? 'あなた自身' : n.senderId;

            item.innerHTML = `
                ${sender}があなたの投稿に**${actionText}**しました。
                <span style="display: block; color: #888; font-size: 0.8em;">${new Date(n.date).toLocaleString('ja-JP')}</span>
            `;

            item.addEventListener('click', handleNotificationClick);
            notificationListElement.appendChild(item);
        });
    }


    // ------------------------------------
    // イベントリスナーのセットアップ関数
    // ------------------------------------
    function setupPostListeners() {
        // 共感ボタンのリスナー (毎回再設定が必要)
        document.querySelectorAll('.empathy-button').forEach(button => {
            button.removeEventListener('click', handleEmpathyClick); 
            button.addEventListener('click', handleEmpathyClick);
        });
        
        // 匿名解除ボタンのリスナー (毎回再設定が必要)
        document.querySelectorAll('.anonymity-toggle-button').forEach(button => {
            button.removeEventListener('click', handleAnonymityToggle); 
            button.addEventListener('click', handleAnonymityToggle);
        });
        
        // 投稿削除ボタンのリスナー (毎回再設定が必要)
        document.querySelectorAll('.delete-post-button').forEach(button => {
            button.removeEventListener('click', handlePostDelete); 
            button.addEventListener('click', handlePostDelete);
        });
        
        // コメント削除ボタンのリスナー (毎回再設定が必要)
        document.querySelectorAll('.delete-comment-button').forEach(button => {
            button.removeEventListener('click', handleCommentDelete); 
            button.addEventListener('click', handleCommentDelete);
        });
    }


    // ------------------------------------
    // イベント処理関数 
    // ------------------------------------

    async function handleSubmitPost() {
        const content = postContent.value.trim();
        if (content.length < 5) {
            alert('メッセージは5文字以上で入力してください。');
            return;
        }
        
        try {
            submitPostButton.disabled = true;
            await createPost(content);
            postContent.value = '';
            // 投稿後、画面を再描画
            renderPosts();
        } catch (error) {
            alert('投稿に失敗しました。');
            console.error('投稿エラー:', error);
        } finally {
            submitPostButton.disabled = false;
        }
    }

    async function handleEmpathyClick(e) {
        const button = e.currentTarget;
        const postId = parseInt(button.dataset.postId);
        
        try {
            button.disabled = true;
            const result = await toggleEmpathy(postId);
            
            // UIの即時更新
            button.innerHTML = result.userEmpathized ? '❤️ 共感済み' : '🤍 共感する';
            document.getElementById(`count-${postId}`).textContent = result.empathyCount;

        } catch (error) {
            alert('共感操作に失敗しました。');
            console.error('共感エラー:', error);
        } finally {
            button.disabled = false;
        }
    }
    
    async function handleCommentSubmit(e) {
        const button = e.currentTarget;
        const postId = parseInt(button.dataset.postId);
        const inputElement = document.getElementById(`commentInput-${postId}`);
        const text = inputElement.value.trim();

        if (text.length === 0) {
            alert('コメントを入力してください。');
            return;
        }

        try {
            button.disabled = true;
            const updatedPost = await addComment(postId, text);
            inputElement.value = '';
            
            // コメントリスト部分だけを再描画し、HTMLを直接更新
            const commentsContainer = document.getElementById(`comments-${postId}`);
            commentsContainer.innerHTML = renderComments(updatedPost.comments, postId); 
            setupPostListeners(); // 新しいコメントの削除ボタンリスナーを設定
            
        } catch (error) {
            alert('コメント投稿に失敗しました。');
            console.error('コメントエラー:', error);
        } finally {
            button.disabled = false;
        }
    }

    async function handleAnonymityToggle(e) {
        const button = e.currentTarget;
        const postId = parseInt(button.dataset.postId);
        const isAnonymous = button.dataset.isAnonymous === 'true';
        const newIsAnonymous = !isAnonymous;

        const confirmMessage = newIsAnonymous
            ? '投稿を匿名（匿名ユーザー）に戻しますか？'
            : '匿名を解除し、あなたのIDを公開しますか？';

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            button.disabled = true;
            await toggleAnonymity(postId, newIsAnonymous);
            
            // 投稿全体を再描画してUIを更新
            renderPosts();
        } catch (error) {
            alert(`匿名性の変更に失敗しました: ${error.message}`);
            console.error('匿名性変更エラー:', error);
        } finally {
            // renderPostsが呼ばれるため、ボタン有効化は不要
        }
    }

    // 投稿削除処理
    async function handlePostDelete(e) {
        const button = e.currentTarget;
        const postId = parseInt(button.dataset.postId);
        
        if (!confirm('本当にこの投稿を削除しますか？\n（コメントも全て削除されます）')) {
            return;
        }

        try {
            button.disabled = true;
            await deletePost(postId);
            renderPosts(); // 画面を再描画
        } catch (error) {
            alert(`投稿の削除に失敗しました: ${error.message}`);
            console.error('投稿削除エラー:', error);
        } finally {
            button.disabled = false;
        }
    }

    // コメント削除処理
    async function handleCommentDelete(e) {
        const button = e.currentTarget;
        const postId = parseInt(button.dataset.postId);
        const commentId = parseInt(button.dataset.commentId);

        if (!confirm('本当にこのコメントを削除しますか？')) {
            return;
        }

        try {
            button.disabled = true;
            await deleteComment(postId, commentId);
            renderPosts(); // コメントリストの再描画のため、投稿全体を再描画
        } catch (error) {
            alert(`コメントの削除に失敗しました: ${error.message}`);
            console.error('コメント削除エラー:', error);
        } finally {
            button.disabled = false;
        }
    }

    // ★★★ 追加: 通知クリック時の処理 ★★★
    function handleNotificationClick(e) {
        const item = e.currentTarget;
        const notificationId = parseInt(item.dataset.notificationId);
        const postId = parseInt(item.dataset.postId);
        
        // 既読にする
        markNotificationAsRead(notificationId);
        
        // 該当投稿までスクロールする (ページ遷移ではなく、コミュニティ内での移動)
        const targetPost = document.querySelector(`.post-item [data-post-id="${postId}"]`)?.closest('.post-item');
        if (targetPost) {
            // スクロール前にメニューを閉じる
            notificationMenu.style.display = 'none';
            notificationButton.setAttribute('aria-expanded', 'false');

            // 該当の投稿をハイライトしてスクロール
            targetPost.style.transition = 'box-shadow 0.3s ease-in-out';
            targetPost.style.boxShadow = '0 0 15px 3px #ffeb3b'; // 黄色でハイライト
            targetPost.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            setTimeout(() => {
                targetPost.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)'; // 元に戻す
            }, 3000);
        } else {
            alert('該当の投稿が見つかりませんでした。');
        }
        
        // UIを更新
        renderNotifications();
    }
    
    // ★★★ 追加: 全て既読にするボタンの処理 ★★★
    function handleMarkAllReadClick() {
        markAllNotificationsAsRead();
        renderNotifications();
    }
    
    // ★★★ 追加: マイページボタンの開閉処理 ★★★
    function toggleMypageMenu() {
        const isExpanded = mypageMenu.style.display === 'block';
        
        // 他のメニューが開いていたら閉じる
        if (notificationMenu.style.display === 'block') {
             notificationMenu.style.display = 'none';
             notificationButton.setAttribute('aria-expanded', 'false');
        }

        mypageMenu.style.display = isExpanded ? 'none' : 'block';
        mypageButton.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
    }
    
    // ★★★ 追加: 通知ボタンの開閉処理 ★★★
    function toggleNotificationMenu() {
        const isExpanded = notificationMenu.style.display === 'block';
        
        // 他のメニューが開いていたら閉じる
        if (mypageMenu.style.display === 'block') {
             mypageMenu.style.display = 'none';
             mypageButton.setAttribute('aria-expanded', 'false');
        }

        notificationMenu.style.display = isExpanded ? 'none' : 'block';
        notificationButton.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        
        // 開くときに通知リストを再描画
        if (!isExpanded) {
            renderNotifications();
        }
    }

// ... (handleMarkAllReadClick 関数の後に追加)

// ★★★ 追加: 名前変更機能のロジック ★★★
async function handleChangeNameClick(e) {
    e.preventDefault();
    const currentName = getUserNickname(currentUserId);
    
    // プロンプトで新しい名前を入力させる
    const newName = prompt('新しいニックネームを入力してください:', currentName);

    if (newName && newName.trim() !== '' && newName.trim() !== currentName) {
        try {
            await setUserName(currentUserId, newName.trim());
            updateMyPageUI(); // UIを更新
            alert('ニックネームが変更されました。');
        } catch (error) {
            alert('名前の変更に失敗しました。');
            console.error('名前変更エラー:', error);
        }
    } else if (newName === '') {
        alert('ニックネームは空にできません。');
    }
}

// ★★★ 追加: マイページUI更新関数 ★★★
function updateMyPageUI() {
    const nickname = getUserNickname(currentUserId);
    const userIdDisplay = document.getElementById('currentUserIdDisplay');
    const changeNameLink = document.getElementById('changeNameLink');

    if (userIdDisplay) {
        userIdDisplay.textContent = `ID: ${currentUserId}`;
    }
    if (changeNameLink) {
        // リンクのテキストを更新
        changeNameLink.innerHTML = `📝 名前の変更 (${nickname})`;
    }
}


    // ------------------------------------
    // 初期化
    // ------------------------------------
    submitPostButton.addEventListener('click', handleSubmitPost);
    
    // ★★★ 追加: マイページと通知のイベントリスナー設定 ★★★
    mypageButton.addEventListener('click', toggleMypageMenu);
    notificationButton.addEventListener('click', toggleNotificationMenu);
    markAllReadButton.addEventListener('click', handleMarkAllReadClick);
    


// ★★★ 追記: 名前変更のイベントリスナーを設定と初期UI更新 ★★★
const changeNameLink = document.getElementById('changeNameLink');
if (changeNameLink) {
    changeNameLink.addEventListener('click', handleChangeNameClick);
}
updateMyPageUI(); // ページロード時にニックネームを反映

    
    // 初期表示
    renderPosts();
    updateNotificationBadge(); // 初期ロード時にバッジを更新
});