document.addEventListener('DOMContentLoaded', function () {
    // Récupérer les informations de l'utilisateur connecté
    fetch('/user-info')
      .then(response => response.json())
      .then(data => {
        const role = data.role;
  
        if (role === 'admin') {
          document.getElementById('adminSection').style.display = 'block';
          loadUsers(); // Charger la liste des utilisateurs pour les admins
        } else {
          document.getElementById('userSection').style.display = 'block';
          document.getElementById('username').value = data.username;
          document.getElementById('email').value = data.email;
        }
      })
      .catch(err => console.error('Erreur lors de la récupération des infos utilisateur:', err));
  
    // Ajouter un utilisateur (admin uniquement)
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
      addUserForm.addEventListener('submit', function (e) {
        e.preventDefault();
  
        const username = document.getElementById('addUsername').value;
        const mdp = document.getElementById('addMdp').value;
        const email = document.getElementById('addEmail').value;
        const role = document.getElementById('addRole').value;
  
        fetch('/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, mdp, email, role })
        })
          .then(response => response.text())
          .then(msg => {
            alert(msg);
            window.location.reload();
          })
          .catch(err => console.error('Erreur lors de l\'ajout de l\'utilisateur:', err));
      });
    }
  
    // Mettre à jour les informations personnelles (utilisateur simple uniquement)
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
      editProfileForm.addEventListener('submit', function (e) {
        e.preventDefault();
  
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
  
        fetch('/update-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email })
        })
          .then(response => response.text())
          .then(msg => {
            alert(msg);
          })
          .catch(err => console.error('Erreur lors de la mise à jour du profil:', err));
      });
    }
  });
  
  // Charger la liste des utilisateurs (admin uniquement)
  function loadUsers() {
    fetch('/users')
      .then(response => response.json())
      .then(users => {
        const tbody = document.getElementById('usersTable').getElementsByTagName('tbody')[0];
        tbody.innerHTML = ''; // Effacer les anciennes données
        users.forEach(user => {
          const row = tbody.insertRow();
          row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>
              <button onclick="deleteUser(${user.id})">Supprimer</button>
            </td>
          `;
        });
      })
      .catch(err => console.error('Erreur lors du chargement des utilisateurs:', err));
  }
  
  // Supprimer un utilisateur (admin uniquement)
  function deleteUser(userId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      fetch(`/users/${userId}`, { method: 'DELETE' })
        .then(response => response.text())
        .then(msg => {
          alert(msg);
          window.location.reload();
        })
        .catch(err => console.error('Erreur lors de la suppression de l\'utilisateur:', err));
    }
  }
  