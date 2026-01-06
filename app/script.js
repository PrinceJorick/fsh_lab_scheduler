        // login page thing and animations
        function handleSelection(clickedBtn) {
            const selectionView = document.getElementById('selection-view');
            const loginView = document.getElementById('login-view');

            const buttons = document.querySelectorAll('.toggle button');
            buttons.forEach(btn => btn.classList.remove('active'));

            selectionView.style.display = 'none';
            loginView.style.display = 'flex';
            loginView.classList.add('fade-in');

            setTimeout(() => {
                loginView.classList.remove('fade-in');
            }, 800);
        }

        function goBack() {
            const selectionView = document.getElementById('selection-view');
            const loginView = document.getElementById('login-view');

            loginView.style.display = 'none';
    
            selectionView.style.display = 'flex';
            selectionView.classList.add('fade-in');

            setTimeout(() => {
                selectionView.classList.remove('fade-in');
            }, 800);
        }