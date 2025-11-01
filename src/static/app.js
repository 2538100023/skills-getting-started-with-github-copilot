document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: compute initials for a participant string (email or name)
  function getInitials(name) {
    if (!name) return "";
    // Try before @ for emails
    const base = name.split("@")[0] || name;
    const parts = base.split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear and reset activity select so options don't duplicate on reload
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list HTML. Show a friendly fallback if empty.
        const participantsHTML = details.participants && details.participants.length
            ? details.participants.map(p => `
                <li data-initials="${getInitials(p)}">
                  <span class="participant-email">${p}</span>
                  <button class="delete-btn" data-email="${p}" title="Remove participant">✕</button>
                </li>
              `).join("")
            : `<li class="no-participants">No participants yet</li>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p><strong>Participants</strong></p>
            <ul class="participants-list">
              ${participantsHTML}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

          // Attach delegated click handler for delete buttons (single handler for the container)
          // We'll add the listener once on the activities list root to capture future items as well.
          // (Guard to avoid adding multiple identical listeners.)
          if (!activitiesList.dataset.deleteListener) {
            activitiesList.addEventListener('click', async (e) => {
              const target = e.target;
              if (!target.classList.contains('delete-btn')) return;

              const email = target.dataset.email;
              const li = target.closest('li');
              const activityCard = target.closest('.activity-card');
              const activityName = activityCard.querySelector('h4').textContent;

              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
                  { method: 'DELETE' }
                );

                const payload = await resp.json();

                if (resp.ok) {
                  // Remove the participant element from the list
                  const ul = li.parentElement;
                  li.remove();

                  // If no participants remain, show the friendly fallback
                  const remaining = ul.querySelectorAll('li:not(.no-participants)');
                  if (remaining.length === 0) {
                    ul.innerHTML = '<li class="no-participants">No participants yet</li>';
                  }

                  messageDiv.textContent = payload.message;
                  messageDiv.className = 'success';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 5000);
                } else {
                  messageDiv.textContent = payload.detail || 'Failed to remove participant';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                }
              } catch (err) {
                console.error('Error removing participant:', err);
                messageDiv.textContent = 'Failed to remove participant. Please try again.';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
              }
            });
            activitiesList.dataset.deleteListener = 'true';
          }

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        
        // Update the activity card's participants list
        const activityCard = [...document.querySelectorAll('.activity-card')]
          .find(card => card.querySelector('h4').textContent === activity);
        
        if (activityCard) {
          const participantsList = activityCard.querySelector('.participants-list');
          const noParticipantsMsg = participantsList.querySelector('.no-participants');
          
          // If there was a "no participants" message, remove it
          if (noParticipantsMsg) {
            noParticipantsMsg.remove();
          }
          
          // Create and add the new participant element
          const newParticipant = document.createElement('li');
          newParticipant.dataset.initials = getInitials(email);
          newParticipant.innerHTML = `
            <span class="participant-email">${email}</span>
            <button class="delete-btn" data-email="${email}" title="Remove participant">✕</button>
          `;
          participantsList.appendChild(newParticipant);
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
