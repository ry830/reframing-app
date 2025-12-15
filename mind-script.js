document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------------
    // グローバル変数とDOM要素の取得
    // ------------------------------------

    const SERVER_BASE_URL = 'https://reframing-app-api.onrender.com';

    const factTextarea = document.getElementById('factTextarea');
    const emotionTextarea = document.getElementById('emotionTextarea');
    const rootThoughtTextarea = document.getElementById('rootThoughtTextarea');
    const skillAnswerArea = document.getElementById('skillAnswer');
    const relationshipAnswerArea = document.getElementById('relationshipAnswer');
    const lessonAnswerArea = document.getElementById('lessonAnswer');
    const summaryArea = document.getElementById('summaryArea');

    const nextStep1Button = document.getElementById('nextStep1Button');
    const nextStep2Button = document.getElementById('nextStep2Button');
    const nextStep3Button = document.getElementById('nextStep3Button');
    const finishButton = document.getElementById('finishButton'); 
    
    // finalSubmitButtonは、AI総評後の完了ボタンとして引き続き使用
    const finalSubmitButton = document.getElementById('finalSubmitButton'); 

    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const step4 = document.getElementById('step-4'); 
    const step5 = document.getElementById('step-5'); 
    
    const aiFeedbackArea = document.getElementById('aiFeedbackArea');
    const aiFeedbackText = document.getElementById('aiFeedbackText');
    const aiSummaryText = document.getElementById('aiSummaryText'); 
    const hintSkillButton = document.getElementById('hintSkillButton');
    const hintRelationshipButton = document.getElementById('hintRelationshipButton');
    const hintLessonButton = document.getElementById('hintLessonButton');
    
    const goToTopButton = document.getElementById('goToTopButton');

    const showCognitiveDistortionHintButton = document.getElementById('showCognitiveDistortionHint');
    const cognitiveDistortionModal = document.getElementById('cognitiveDistortionModal');
    const closeCognitiveDistortionModalButton = document.getElementById('closeCognitiveDistortionModalButton');
    const closeCognitiveDistortionModalButton2 = document.getElementById('closeCognitiveDistortionModalButton2')

    
    // --------------------------------------------------------------------------------

    const SERVER_URL_REFRAMING = `${SERVER_BASE_URL}/api/ai/reframing`; 
    const SERVER_URL_SUMMARY = `${SERVER_BASE_URL}/api/ai/finish`;
    const SERVER_URL_RECORD_SAVE = `${SERVER_BASE_URL}/api/records/save`; 

    let currentRecord = {}; 
    let currentRecordId = null; // 現在編集中（または作成中）の記録ID
    
    const resourceMap = {
        skill: 'スキル',
        relationship: '人間関係',
        lesson: '人生の教訓'
    };

    // ★認証情報の取得 (保存機能のために必須)★
    const storedToken = localStorage.getItem('authToken'); 
    let authToken = null;

    if (!storedToken) {
        console.warn("認証トークンが見つかりません。記録を保存できません。");
    } else {
        authToken = storedToken;
    }

    // ------------------------------------
    // ユーティリティ関数：既存のレコードを更新する専用の関数 (PUT処理)
    // ------------------------------------
    async function updateExistingRecord(record) {
        if (!record._id) {
            console.error("更新するレコードIDがありません。");
            return false;
        }

        try {
            // 注意: fetch の URL は相対パスで /api/records/id となる

            const url = `${SERVER_BASE_URL}/api/records/${record._id}`;
            
            const response = await fetch(url, { // fetch(url, ...) に変更
            method: 'PUT', // PUT メソッドで更新エンドポイントを叩く
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(record)
        });

            if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        // 更新成功
        return true; 
    } catch (error) {
        console.error("レコード更新中にエラーが発生しました:", error);
        return false;
    }
    }
    
    // ------------------------------------
    // ユーティリティ関数：API経由での記録保存 (POST処理 - IDを返すように修正)
    // ------------------------------------
    const saveRecord = async (recordData) => {
        if (!authToken) {
            alert("ログイン情報がありません。記録を保存するには auth.html に戻り、ログインが必要です。");
            return null; // 失敗時は null を返す
        }
        
        try {
            const response = await fetch(SERVER_URL_RECORD_SAVE, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` // 認証トークンをヘッダーに追加
                },
                body: JSON.stringify(recordData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("サーバー保存エラー:", errorData.message || '保存失敗');
                return null; // 失敗時は null を返す
            }
            
            // 成功した場合、サーバーから返されたレコードのIDを取得し、返す
            const savedRecord = await response.json();
            return savedRecord.id; // ★修正: 保存されたIDを直接返す★
            
        } catch (error) {
            console.error("記録保存中のネットワークエラー:", error);
            return null; // 失敗時は null を返す
        }
    };

    // ------------------------------------
    // ユーティリティ関数：HTMLエスケープ
    // ------------------------------------
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    // ------------------------------------
    // ユーティリティ関数：AIメンターへのリクエスト
    // ------------------------------------
    const getAdvice = async (resourceType, buttonElement) => {
        const fact = factTextarea.value.trim(); 
        const rootThought = rootThoughtTextarea.value.trim(); 
        
        const resourceNameJp = resourceMap[resourceType] || resourceType;

        if (fact === '' || rootThought === '') {
            alert("Step 1（事実の記録）と Step 2（思考のクセ）を完了してから、ヒントを求めてください。");
            return;
        }

        aiFeedbackText.innerHTML = `AIメンターが${resourceNameJp}のヒントを分析中です... しばらくお待ちください。`;
        aiFeedbackArea.style.display = 'block';
        buttonElement.disabled = true; 

        try {
            const response = await fetch(SERVER_URL_REFRAMING, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fact, rootThought, resourceType }), 
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`サーバーエラー: ${response.status} - ${errorData.error || '不明なエラー'}`);
            }

            const data = await response.json();
            
            aiFeedbackText.innerHTML = `🤖 ${resourceNameJp}ヒント:<br>${data.advice.replace(/\n/g, '<br>')}`; 
            
        } catch (error) {
            console.error("AI通信エラー:", error);
            aiFeedbackText.innerHTML = `⚠️ エラーが発生しました。サーバーが起動しているか確認してください。(${error.message})`;
        } finally {
            buttonElement.disabled = false; 
        }
    };
    
    // ------------------------------------
    // 画面遷移とイベントリスナー
    // ------------------------------------
    nextStep1Button.addEventListener('click', () => {
        const factText = factTextarea.value.trim();
        if (factText === '') {
            alert('心が揺らいだ出来事を事実として記録してください。');
            return;
        }
        currentRecord.tempId = new Date().getTime(); 
        currentRecord.fact = factText;
        currentRecord.date = new Date().toISOString();
        
        if (step1 && step2) {
            step1.style.display = 'none';
            step2.style.display = 'block';
        }
    });

    nextStep2Button.addEventListener('click', () => {
        const emotionText = emotionTextarea.value.trim();
        const rootThoughtText = rootThoughtTextarea.value.trim();

        if (emotionText === '' || rootThoughtText === '') {
            alert('感情と根源の考え（思考のクセ）の両方を入力してください。');
            return;
        }
        
        currentRecord.emotion = emotionText;
        currentRecord.rootThought = rootThoughtText;

        if (step2 && step3) {
            step2.style.display = 'none';
            step3.style.display = 'block'; 
        }
        
        aiFeedbackArea.style.display = 'none'; 
    });

    // 3つの個別ヒントボタンのイベントリスナー
    if (hintSkillButton) {
        hintSkillButton.addEventListener('click', () => getAdvice('skill', hintSkillButton));
    }
    if (hintRelationshipButton) {
        hintRelationshipButton.addEventListener('click', () => getAdvice('relationship', hintRelationshipButton));
    }
    if (hintLessonButton) {
        hintLessonButton.addEventListener('click', () => getAdvice('lesson', hintLessonButton));
    }
    
    // ------------------------------------
    // STEP 3, 4, 5 ロジック
    // ------------------------------------
    const renderSummary = () => { 
        const summaryArea = document.getElementById('summaryArea');
        if (!summaryArea) return;

        let summaryHtml = `
            <h4 style="color: #3498db; border-bottom: 1px solid #ccc; padding-bottom: 5px;">STEP 1: 事実の記録</h4>
            <p style="padding-left: 10px; font-size: 15px;">${currentRecord.fact}</p>
            
            <h4 style="color: #e67e22; border-bottom: 1px solid #ccc; padding-top: 10px; padding-bottom: 5px;">STEP 2: 思考のクセ分析</h4>
            <p style="padding-left: 10px; font-size: 15px;"><strong>湧き出た感情:</strong> ${currentRecord.emotion}</p>
            <p style="padding-left: 10px; font-size: 15px;"><strong>根源にある考え（思考のクセ）:</strong> ${currentRecord.rootThought}</p>
            
            <h4 style="color: #27ae60; border-bottom: 1px solid #ccc; padding-top: 10px; padding-bottom: 5px;">STEP 3: 強みへの変換</h4>
        `;
        
        // 3つの回答を手動で追加 
        summaryHtml += `<div style="margin-bottom: 5px;">
            <p style="font-weight: bold; font-size: 15px; margin-bottom: 0;">スキルへの変換：</p>
            <p style="padding-left: 10px; border-left: 3px solid #27ae60; font-size: 15px; margin-top: 0;">${escapeHtml(currentRecord.skillAnswer).replace(/\n/g, '<br>')}</p>
        </div>`;
        summaryHtml += `<div style="margin-bottom: 5px;">
            <p style="font-weight: bold; font-size: 15px; margin-bottom: 0;">人間関係への変換：</p>
            <p style="padding-left: 10px; border-left: 3px solid #27ae60; font-size: 15px; margin-top: 0;">${escapeHtml(currentRecord.relationshipAnswer).replace(/\n/g, '<br>')}</p>
        </div>`;
        summaryHtml += `<div style="margin-bottom: 5px;">
            <p style="font-weight: bold; font-size: 15px; margin-bottom: 0;">教訓への変換：</p>
            <p style="padding-left: 10px; border-left: 3px solid #27ae60; font-size: 15px; margin-top: 0;">${escapeHtml(currentRecord.lessonAnswer).replace(/\n/g, '<br>')}</p>
        </div>`;
        
        summaryArea.innerHTML = summaryHtml;
    };


    nextStep3Button.addEventListener('click', () => {
        const skillAnswer = skillAnswerArea.value.trim();
        const relationshipAnswer = relationshipAnswerArea.value.trim();
        const lessonAnswer = lessonAnswerArea.value.trim();
        
        if (skillAnswer === '' || relationshipAnswer === '' || lessonAnswer === '') {
            alert('3つの資源の質問をすべて完了してください。');
            return;
        }

        currentRecord.skillAnswer = skillAnswer;
        currentRecord.relationshipAnswer = relationshipAnswer;
        currentRecord.lessonAnswer = lessonAnswer;

        renderSummary(); 
        
        if (step3 && step4) {
            step3.style.display = 'none';
            step4.style.display = 'block'; 
        }
        
        aiFeedbackArea.style.display = 'none';
    });
    

    // STEP 5: 総評ロジック (AI連携と最終保存)
    const generateSummaryAndFinish = async (finalRecord) => { 
        if (step4 && step5) {
            step4.style.display = 'none';
            step5.style.display = 'block'; 
        }

        const summaryDisplay = document.getElementById('summaryDisplay');
        if (summaryDisplay) {
            // AI総評生成中のメッセージを表示
            summaryDisplay.innerHTML = `<h4 style="color: #8e44ad;">AI総評を生成中です...</h4><p>数秒お待ちください。AIサーバーに接続できない場合、総評はスキップされます。</p><div id="aiSummaryText"></div>`;
        }

        const aiSummaryTextElement = document.getElementById('aiSummaryText');
        
        try {
            // ★修正: 更新するために、finalRecordにIDをセット
            if (currentRecordId) {
                finalRecord._id = currentRecordId; 
            }

            // AI総評の生成リクエスト
            const response = await fetch(SERVER_URL_SUMMARY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ record: finalRecord }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`サーバーエラー: ${response.status} - ${errorData.error || '不明なエラー'}`);
            }

            const data = await response.json();
            const generatedSummary = data.summary;
            
            // AI総評を画面に表示
            aiSummaryTextElement.innerHTML = generatedSummary.replace(/\n/g, '<br>');
            finalRecord.summary = generatedSummary; // 最終レコードにAI総評を追加

        } catch (error) {
            console.error("AI総評エラー:", error);
            aiSummaryTextElement.innerHTML = `⚠️ 総評の生成中にエラーが発生しました。AI総評は記録されません。`;
            finalRecord.summary = 'AI総評生成エラーにより記録なし'; 
        }
        
        // ★★★★★ 修正: AI総評を含むレコードをデータベースに更新 ★★★★★
        // finalRecord._id がセットされている場合のみ更新を試みる
        if (finalRecord.summary !== 'AI総評生成エラーにより記録なし' && finalRecord.summary !== '未生成' && finalRecord._id) {
            const updateSuccess = await updateExistingRecord(finalRecord); 
            if (!updateSuccess) {
                console.error("致命的警告: AI総評のデータベース更新に失敗しました。");
                alert("AI総評は生成されましたが、データベースへの保存（更新）に失敗しました。");
            }
        }
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        
        // 最終保存ボタンの表示 (AI総評の成功/失敗に関わらず)
        const finalSubmitButtonHtml = `
            <button class="button-primary" id="finalSubmitButton" style="background-color: #27ae60; border-color: #27ae60; margin-top: 25px;">トップに戻る</button>
        `;
        document.getElementById('summaryDisplay').insertAdjacentHTML('beforeend', finalSubmitButtonHtml);

        // 最終保存後の処理は、既にSTEP 4で保存済みのため、ここではリダイレクトのみ
        document.getElementById('finalSubmitButton').addEventListener('click', () => {
            alert('記録処理が完了しました。');
            window.location.href = 'index.html';
        });
    };


    // STEP 4: 最終確認と記録保存へ (finishButtonをクリック)
    if (finishButton) {
        finishButton.addEventListener('click', async () => {
            try {
                // 1. 永続保存のための finalRecord 構築 (AI総評追記のために必要なフィールドのみ)
                const finalRecord = {
                    tempId: currentRecord.tempId, 
                    type: 'mindRecord', 
                    date: currentRecord.date,
                    fact: currentRecord.fact,
                    emotion: currentRecord.emotion,
                    rootThought: currentRecord.rootThought,
                    answers: [ 
                        { type: 'skill', answer: currentRecord.skillAnswer },
                        { type: 'relation', answer: currentRecord.relationshipAnswer }, 
                        { type: 'lesson', answer: currentRecord.lessonAnswer }
                    ],
                    summary: '未生成', // AI総評はまだない
                };

                // ★★★ 2. 記録を保存し、IDを受け取る ★★★
                finishButton.disabled = true; 
                finishButton.textContent = '記録を保存中...';

                // 修正: IDを受け取り、変数 recordId に格納 (saveRecordがIDを返すため)
                const recordId = await saveRecord(finalRecord); 

                if (!recordId) { // IDが null だったら失敗
                    alert('致命的エラー: 記録の保存に失敗しました。AI総評に進めません。F12コンソールを確認してください。');
                    finishButton.disabled = false;
                    finishButton.textContent = '記録を完了し、保存する';
                    return;
                }
                
                // 修正: 取得したIDをグローバル変数に格納 (generateSummaryAndFinishで利用)
                currentRecordId = recordId; 

                // 3. 保存成功後、AI総評の生成と表示へ移行
                finishButton.textContent = '保存成功。AI総評に進みます...';
                generateSummaryAndFinish(finalRecord); 

                
            } catch (error) {
                console.error("データの保存中に致命的なエラーが発生しました:", error);
                alert('致命的なエラーが発生しました。記録は保存されていません。F12キーでコンソールを確認してください。');
            }
        });
        
    }


    // ------------------------------------
    // 💡 トレーニング説明機能の追加 (モーダル方式に修正)
    // ------------------------------------
    const showInstructionButton = document.getElementById('showInstructionButton');
    const instructionModal = document.getElementById('instructionModal');
    const closeModalButton = document.getElementById('closeModalButton');

    if (showInstructionButton) {
        // 「トレーニングの目的と使い方」ボタンが押されたとき
        showInstructionButton.addEventListener('click', () => {
            instructionModal.style.display = 'block';
        });
    }

    if (closeModalButton) {
        // 閉じるボタン（×）が押されたとき
        closeModalButton.addEventListener('click', () => {
            instructionModal.style.display = 'none';
        });
    }

    // モーダルの外側をクリックしても閉じるようにする
    window.addEventListener('click', (event) => {
        if (event.target === instructionModal) {
            instructionModal.style.display = 'none';
        }
    });


    // ------------------------------------
    // 🤔 思考のクセ ヒント機能の追加
    // ------------------------------------
    const closeCognitiveDistortionModal = () => {
        cognitiveDistortionModal.style.display = 'none';
    };

    // 1. ヒントボタンが押されたとき
    if (showCognitiveDistortionHintButton) {
        showCognitiveDistortionHintButton.addEventListener('click', () => {
            if (cognitiveDistortionModal) { 
                cognitiveDistortionModal.style.display = 'block';
            } else {
                console.error("エラー: cognitiveDistortionModal 要素が見つかりません。HTML IDを確認してください。");
            }
        });
    }

    if (closeCognitiveDistortionModalButton) {
        closeCognitiveDistortionModalButton.addEventListener('click', closeCognitiveDistortionModal);
    }
    if (closeCognitiveDistortionModalButton2) {
        closeCognitiveDistortionModalButton2.addEventListener('click', closeCognitiveDistortionModal);
    }

    // モーダルの外側をクリックしても閉じるようにする
    window.addEventListener('click', (event) => {
        if (event.target === instructionModal) {
            instructionModal.style.display = 'none';
        }
        // 思考のクセモーダルにも追加
        if (event.target === cognitiveDistortionModal) {
            cognitiveDistortionModal.style.display = 'none';
        }
    });


    // STEP 5: トップに戻るボタン（旧ボタン）は非表示
    if (goToTopButton) {
        goToTopButton.addEventListener('click', () => {
            window.location.href = 'index.html'; 
        });
    }
});