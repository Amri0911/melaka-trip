document.addEventListener("DOMContentLoaded", function() {
    // Fungsi untuk Scroll Reveal Animation
    function reveal() {
        var reveals = document.querySelectorAll(".reveal");

        for (var i = 0; i < reveals.length; i++) {
            var windowHeight = window.innerHeight;
            var elementTop = reveals[i].getBoundingClientRect().top;
            var elementVisible = 100; // Jarak dari bawah skrin sebelum animasi bermula

            if (elementTop < windowHeight - elementVisible) {
                reveals[i].classList.add("active");
            }
        }
    }

    // Panggil fungsi sekali masa page load
    reveal();

    // Trigger fungsi setiap kali pengguna scroll
    window.addEventListener("scroll", reveal);
});