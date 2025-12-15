
// meditation-script.js

document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------------
    // グローバル変数とDOM要素の取得
    // ------------------------------------
    const bodyElement = document.body;
    const timerDisplay = document.getElementById('timer');
    const durationSelect = document.getElementById('durationSelect');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const startContainer = document.getElementById('startContainer');
    const stopContainer = document.getElementById('stopContainer');
    const recordContainer = document.getElementById('recordContainer');
    const recordForm = document.getElementById('recordForm');
    const mindsetState = document.getElementById('mindsetState');
    const meditationBGM = document.getElementById('meditationBGM');
    const mainTitle = document.querySelector('h1');
    // const backToHomeLink = document.querySelector('.back-to-home'); // 以前のリンクは削除
    const backToHomeMeditation = document.querySelector('.back-to-home-meditation'); // ★新しいリンクを取得★

    let initialDuration;
    let remainingDuration;
    let timerInterval;
    let isRunning = false;
    let startTime;

    // ------------------------------------
    // ユーティリティ関数
    // ------------------------------------
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const formattedSeconds = String(remainingSeconds).padStart(2, '0');
        return `${minutes}:${formattedSeconds}`;
    }

    function initializeTimer() {
        const selectedMinutes = parseInt(durationSelect.value);
        initialDuration = selectedMinutes * 60;
        remainingDuration = initialDuration;
        timerDisplay.textContent = formatTime(remainingDuration);
    }
    
    durationSelect.addEventListener('change', initializeTimer);
    initializeTimer();


    // ------------------------------------
    // UIの状態を管理する関数
    // ------------------------------------
    function setUIState(state) {
        // 全てのコンテナを非表示に
        startContainer.style.display = 'none';
        stopContainer.style.display = 'none';
        recordContainer.style.display = 'none';

        // 状態に応じて表示を切り替える
        if (state === 'initial') {
            bodyElement.classList.remove('is-meditating');
            startContainer.style.display = 'block';
            mainTitle.style.display = 'block';
            backToHomeMeditation.style.display = 'block';
        } else if (state === 'meditating') {
            bodyElement.classList.add('is-meditating');
            stopContainer.style.display = 'block';
            mainTitle.style.display = 'none';
            backToHomeMeditation.style.display = 'none';
        } else if (state === 'recording') {
            bodyElement.classList.remove('is-meditating');
            recordContainer.style.display = 'block';
            mainTitle.style.display = 'block';
            backToHomeMeditation.style.display = 'block';
        }
    }


    // ------------------------------------
    // タイマー制御ロジック
    // ------------------------------------

    function startTimer() {
        if (isRunning) return;
        
        initializeTimer();
        isRunning = true;
        startTime = new Date();

        setUIState('meditating');

        meditationBGM.volume = 0.5;
        meditationBGM.play().catch(error => {
            console.warn("BGMの自動再生に失敗しました。", error);
        });
        
        timerInterval = setInterval(() => {
            remainingDuration--;
            timerDisplay.textContent = formatTime(remainingDuration);

            if (remainingDuration <= 0) {
                completeMeditation();
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        isRunning = false;

        meditationBGM.pause();
        meditationBGM.currentTime = 0;

        showRecordForm(initialDuration - remainingDuration); 
    }
    
    function completeMeditation() {
        clearInterval(timerInterval);
        isRunning = false;
        
        meditationBGM.pause();
        meditationBGM.currentTime = 0;

        timerDisplay.textContent = "終了！";
        showRecordForm(initialDuration);
    }
    
    function showRecordForm(timeInSeconds) {
        setUIState('recording');
        
        recordContainer.dataset.completedTime = timeInSeconds;
        
        const completionMessage = recordContainer.querySelector('.completion-message');
        completionMessage.textContent = `お疲れ様でした！${formatTime(timeInSeconds)} 間の瞑想を記録しましょう。`;
    }

    // ------------------------------------
    // 記録保存ロジック
    // ------------------------------------

    recordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const completedTime = parseInt(recordContainer.dataset.completedTime) || 0;
        const mindset = mindsetState.value;
        
        if (completedTime < 10) { 
            alert('瞑想時間が短すぎるため、記録をスキップします。');
            setUIState('initial');
            return;
        }

        // 1. 永続保存のための newRecord 構築
        const newRecord = {
            // idの自動付与を削除 (script.jsのsaveRecordが担当)
            type: 'meditation',
            date: new Date().toISOString(), // ★日付情報を明示的に追加★
            duration: completedTime,
            mindset: mindset
        };

        try {
            // ★★★ 共通関数 saveRecord を利用 ★★★
            const isSaved = saveRecord(newRecord);

            if (!isSaved) {
                 // saveRecord内でアラートが出るはずだが、念のため
                 return;
            }
            
            alert(`瞑想記録 (${formatTime(completedTime)}) を保存しました！`);
            
            setUIState('initial');

        } catch (error) {
            console.error("瞑想記録の保存中にエラー:", error);
            alert('記録の保存に失敗しました。');
        }
    });

    // ------------------------------------
    // イベントリスナー
    // ------------------------------------
    startButton.addEventListener('click', startTimer);
    stopButton.addEventListener('click', stopTimer);

    // 初期UI状態を設定
    setUIState('initial');
});