// Redirect configuration
const REDIRECT_URL = "https://romiojoseph.github.io/imdb-data-analyzer/";
const REDIRECT_DELAY = 3; // seconds

document.addEventListener('DOMContentLoaded', () => {
    const countdownElement = document.getElementById('countdown');
    let secondsLeft = REDIRECT_DELAY;

    // Update countdown display
    const updateCountdown = () => {
        if (countdownElement) {
            countdownElement.textContent = secondsLeft;
        }

        if (secondsLeft <= 0) {
            window.location.href = REDIRECT_URL;
        } else {
            secondsLeft--;
            setTimeout(updateCountdown, 1000);
        }
    };

    // Start the countdown
    updateCountdown();
});
