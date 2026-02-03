document.addEventListener('DOMContentLoaded', () => {
    const scenes = document.querySelectorAll('.scene');
    const progressBar = document.getElementById('progressBar');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pauseBtn = document.getElementById('pauseBtn');

    let currentSceneIndex = 0;
    let isPaused = false;
    let progressInterval;
    let sceneTimer;
    let remainingTime = 0;
    let totalDuration = 0;
    let startTime = 0;

    // Initialize first scene
    activateScene(0);

    // Event Listeners
    nextBtn.addEventListener('click', () => nextScene());
    prevBtn.addEventListener('click', () => prevScene());
    pauseBtn.addEventListener('click', togglePause);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') nextScene();
        if (e.key === 'ArrowLeft') prevScene();
        if (e.key === ' ') togglePause();
    });

    function activateScene(index) {
        // Cleanup previous
        scenes.forEach(s => {
            s.classList.remove('active');
            // Reset animations by cloning and replacing? No, simplified: just remove class.
            // In CSS, opacity transition handles it. To restart CSS animations on re-entry, we might need more logic,
            // but for simple forward flow, this is okay.
        });

        currentSceneIndex = index;
        const currentScene = scenes[currentSceneIndex];
        currentScene.classList.add('active');

        // Restart animations for this scene (optional hack to force reflow)
        const animatedElements = currentScene.querySelectorAll('[class*="fade-in"], [class*="slide-in"], [class*="zoom-in"], [class*="pop-in"], [class*="drop-in"]');
        animatedElements.forEach(el => {
            const animationName = el.style.animationName;
            el.style.animation = 'none';
            el.offsetHeight; /* trigger reflow */
            el.style.animation = '';
        });


        // Setup Timing
        totalDuration = parseInt(currentScene.dataset.duration) || 5000;
        remainingTime = totalDuration;
        startTimer();
    }

    function startTimer() {
        if (isPaused) return;

        clearInterval(progressInterval);
        clearTimeout(sceneTimer);

        const updateRate = 50; // ms
        startTime = Date.now();

        // Progress bar logic
        progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            // Note: In a real "resume" scenario, we'd add previously elapsed time. 
            // For simplicity in this v1, we just run the remaining time from 0 to 100% of *remaining*.
            // Better visual: Calculate percentage based on (Total - Remaining + Elapsed).
            // But let's just do a simple linear decrement of remaining time.

            remainingTime -= updateRate;
            startTime = Date.now(); // Reset start info for next tick accuracy

            const percentComplete = ((totalDuration - remainingTime) / totalDuration) * 100;
            progressBar.style.width = `${Math.min(100, Math.max(0, percentComplete))}%`;

            if (remainingTime <= 0) {
                nextScene();
            }
        }, updateRate);
    }

    function togglePause() {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '▶' : '❚❚';
        if (isPaused) {
            clearInterval(progressInterval);
            clearTimeout(sceneTimer);
        } else {
            startTimer();
        }
    }

    function nextScene() {
        let nextIndex = currentSceneIndex + 1;
        if (nextIndex >= scenes.length) {
            // Loop or Stop? Let's stop at the end or loop. Instructions not specific. Let's Loop.
            nextIndex = 0;
        }
        activateScene(nextIndex);
    }

    function prevScene() {
        let prevIndex = currentSceneIndex - 1;
        if (prevIndex < 0) {
            prevIndex = scenes.length - 1;
        }
        activateScene(prevIndex);
    }
});
