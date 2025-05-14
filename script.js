const slider = document.querySelector(".slider"); // Get the main slider container
const slides = document.querySelector(".slides");
const slideCount = document.querySelectorAll(".slide").length;
// Removed references to prevBtn and nextBtn
const dotNavigation = document.querySelector(".dot-navigation");
let index = 0;
let autoSlideInterval; // Variable to hold the interval timer

// --- Swipe/Drag Variables ---
let isDragging = false;
let startPos = 0; // Start position of the drag (pageX or clientX)
let currentTranslate = 0; // Current temporary translate during drag
let startTranslate = 0; // Translate value when drag started
const dragThreshold = 50; // Minimum pixels to trigger a slide change
let isClickBlocked = false; // Flag to prevent click after drag
let dragMoveThreshold = 10; // Pixels moved to consider it a drag (vs click)
let initialTouchPosY = 0; // For detecting vertical scroll intention

// --- Event Listeners for Swipe ---
slides.addEventListener('touchstart', dragStart, { passive: true }); // Use passive for better scrolling performance
slides.addEventListener('touchend', dragEnd);
slides.addEventListener('touchmove', drag, { passive: false }); // Need passive: false to preventDefault

slides.addEventListener('mousedown', dragStart);
slides.addEventListener('mouseup', dragEnd);
slides.addEventListener('mousemove', drag);
slides.addEventListener('mouseleave', dragEnd);
slides.addEventListener('dragstart', (e) => e.preventDefault()); // Prevent native drag


// --- Swipe/Drag Functions ---
function dragStart(event) {
    // Only start drag if it's a primary click/touch
    if (event.type === 'mousedown' && event.button !== 0) return;

    isDragging = true;
    slides.classList.add('dragging');
    clearInterval(autoSlideInterval); // Stop auto-slide

    startPos = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    initialTouchPosY = event.type.includes('mouse') ? event.pageY : event.touches[0].clientY;


    // Get the initial transform value in pixels
    const transformMatrix = window.getComputedStyle(slides).getPropertyValue('transform');
    if (transformMatrix && transformMatrix !== 'none') {
        const matrix = transformMatrix.match(/matrix\((.+)\)/);
        if (matrix && matrix[1]) {
             startTranslate = parseFloat(matrix[1].split(', ')[4]);
        } else {
            startTranslate = 0;
        }
    } else {
        startTranslate = 0;
    }
    currentTranslate = startTranslate; // Start current translate from the initial position

    isClickBlocked = false; // Reset click block
}

function drag(event) {
    if (!isDragging) return;

    const currentPos = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    const deltaX = currentPos - startPos; // Distance moved horizontally

    const currentPosY = event.type.includes('mouse') ? event.pageY : event.touches[0].clientY;
    const deltaY = currentPosY - initialTouchPosY; // Distance moved vertically


     // If the horizontal drag is much larger than vertical, prevent default (scrolling)
     if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
         event.preventDefault();
     } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 5) {
         // If vertical drag is significant, might be trying to scroll, end drag
          if (Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX) * 2) { // If vertical is more than double horizontal + threshold
             dragEnd(event); // Call dragEnd to snap back
             return; // Stop processing drag horizontally
          }
     }


    // Calculate the new temporary translate value
    currentTranslate = startTranslate + deltaX;

    // Apply temporary transform directly (CSS transition is OFF due to 'dragging' class)
    slides.style.transform = `translateX(${currentTranslate}px)`;

    // If moved more than threshold, mark to block click later
     if (Math.abs(deltaX) > dragMoveThreshold) { // Use dragMoveThreshold
        isClickBlocked = true;
     }
}

function dragEnd(event) {
    if (!isDragging) {
         // If dragEnd was triggered by vertical scroll detection in drag()
         resetAutoSlide(); // Reset auto-slide even if only vertical scroll happened after start
         return;
    }

    isDragging = false;
    slides.classList.remove('dragging'); // Re-enable CSS transition

    const movedBy = currentTranslate - startTranslate; // Total drag distance

    // Determine which slide to snap to based on swipe distance
    let targetIndex = index;
    if (movedBy < -dragThreshold && index < slideCount - 1) {
        targetIndex = index + 1; // Swipe left -> next slide
    } else if (movedBy > dragThreshold && index > 0) {
        targetIndex = index - 1; // Swipe right -> previous slide
    }
    // If not enough drag, targetIndex remains the same (snap back to current)

    index = targetIndex; // Update the global index

    // Update slider position using the standard updateSlider function (uses VW and transition)
    updateSlider();

    // Reset auto-slide timer
    resetAutoSlide();

     // A small delay before allowing clicks again, in case updateSlider transition takes time
     // This helps prevent the link from opening if the user releases drag over the image.
     // The delay should be at least as long as the CSS transition.
     const transitionDurationMs = slides.style.transitionDuration ? parseFloat(slides.style.transitionDuration) * 1000 : 0;
     setTimeout(() => {
        isClickBlocked = false;
     }, transitionDurationMs + 50); // Add a small buffer
}


// --- Navigation Functions ---

// Function to create dots dynamically
function createDots() {
    dotNavigation.innerHTML = ''; // Clear existing dots
    for (let i = 0; i < slideCount; i++) {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        dot.dataset.index = i; // Store index on the dot
        dotNavigation.appendChild(dot);

        // Add click listener to dots
        dot.addEventListener('click', () => {
            index = parseInt(dot.dataset.index);
            updateSlider();
            resetAutoSlide(); // Reset timer on manual click
        });
    }
}

// Function to update the slide position and active elements
function updateSlider() {
  // Use VW for transform based on the current index
  slides.style.transform = `translateX(-${index * 100}vw)`;

  // Removed button disabled state updates

  // Update active dot class
  const dots = document.querySelectorAll('.dot');
  dots.forEach(dot => {
    dot.classList.remove('active');
    if (parseInt(dot.dataset.index) === index) {
      dot.classList.add('active');
    }
  });
}

// Function to start auto sliding
function startAutoSlide() {
    // Clear any existing interval first
    clearInterval(autoSlideInterval);
    // Set new interval: 2000ms pause + 1000ms transition = 3000ms total delay per slide
    autoSlideInterval = setInterval(() => {
        index = (index + 1) % slideCount; // Loop back to the first slide
        updateSlider();
    }, 3000); // 3000 milliseconds = 3 seconds (2s pause + 1s slide)
}

// Function to reset the auto slide timer
function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
}

// --- Prevent Link Click during Drag (Refined) ---
// Add a specific listener to the *slider container* to check the flag
slider.addEventListener('click', (event) => {
    // If the click was marked as blocked by the drag logic
    if (isClickBlocked) {
        event.preventDefault();
        event.stopPropagation(); // Prevent link from firing
         // The flag is reset in dragEnd after a delay
    }
}, true); // Use capture phase to intercept click early


// --- Initialization ---
createDots(); // Create navigation dots
updateSlider(); // Set initial slide and button/dot state
startAutoSlide(); // Start the automatic sliding

// Recalculate slider position on window resize (important for VW based transform)
window.addEventListener('resize', updateSlider);
