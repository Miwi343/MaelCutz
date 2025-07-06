// Force video autoplay with multiple fallbacks for Safari and other browsers
const video = document.getElementById('bg-video');
if (video) {
  // Try immediate autoplay
  video.play().catch(function(error) {
    console.log("Video autoplay failed:", error);
    
    // Fallback 1: Try on any user interaction
    const playVideo = () => {
      video.play().catch(e => console.log("Play failed:", e));
    };
    
    // Multiple event listeners for different browsers
    document.addEventListener('click', playVideo, { once: true });
    document.addEventListener('touchstart', playVideo, { once: true });
    document.addEventListener('keydown', playVideo, { once: true });
    document.addEventListener('scroll', playVideo, { once: true });
    
    // Fallback 2: Try after a short delay
    setTimeout(playVideo, 1000);
    
    // Fallback 3: Try when page becomes visible
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) {
        playVideo();
      }
    });
  });
}

// Optimized scroll animations
document.querySelectorAll('section').forEach(section => {
  section.classList.remove('visible');
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      requestAnimationFrame(() => {
        entry.target.classList.add('visible');
      });
    }
  });
}, { 
  threshold: 0.1,
  rootMargin: '0px 0px -10% 0px'
});

document.querySelectorAll('section').forEach(section => {
  observer.observe(section);
});
