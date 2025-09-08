const socket = io();
    const userList = document.getElementById("user-list");
    const chatLog = document.getElementById("chat-log");
    const input = document.getElementById("admin-input");

    let selectedUser = null;
    const chatStorage = {};
    const userNames = {};

    function selectUser(userId) {
      selectedUser = userId;
      renderChat(userId);
    }

    function renderChat(userId) {
      chatLog.innerHTML = "";
      const logs = chatStorage[userId] || [];

      logs.forEach(entry => {
        const wrapper = document.createElement("div");
        wrapper.className = "message-wrapper " + entry.from;
      
        const div = document.createElement("div");
        div.className = "message " + entry.from;
      
        if (entry.from === "system") {
          div.style.fontStyle = "italic";
          div.style.color = "gray";
        }
      
        div.textContent = (entry.from === "admin" ? "" : //pesan admin
                          entry.from === "system" ? entry.text :
                          "") + (entry.from !== "system" ? entry.text : ""); //userNames[userId] + (pesan user)
      
        wrapper.appendChild(div);
        chatLog.appendChild(wrapper);
      });
    
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    function sendMessage() {
      const text = input.value.trim();
      if (text && selectedUser) {
        socket.emit("admin_reply", {
          to: selectedUser,
          message: text
        });

        chatStorage[selectedUser] = chatStorage[selectedUser] || [];
        chatStorage[selectedUser].push({ from: "admin", text });
        renderChat(selectedUser);
        input.value = "";
      }
    }

    socket.on("admin_receive", ({ user_id, name, npm, email, message }) => {
      let li = document.getElementById(user_id);
        
      if (!li) {
        // User belum ada di list → tambahkan
        li = document.createElement("li");
        li.className = "user-item";
        li.id = user_id;
        li.onclick = () => {
          selectUser(user_id);
          li.classList.remove("new-message"); // hapus notif saat dibuka
        };
      
        const nameSpan = document.createElement("div");
        nameSpan.className = "user-name";
        nameSpan.textContent = name;

        const npmSpan = document.createElement("div");
        npmSpan.className = "user-npm";
        npmSpan.textContent = npm;
      
        const emailSpan = document.createElement("div");
        emailSpan.className = "user-email";
        emailSpan.textContent = email;
      
        li.appendChild(nameSpan);
        li.appendChild(npmSpan);
        li.appendChild(emailSpan);
        userList.appendChild(li);
      
        userNames[user_id] = name;
      }
    
      // Simpan chat ke riwayat
      chatStorage[user_id] = chatStorage[user_id] || [];
      chatStorage[user_id].push({ from: "user", text: message });
    
      if (user_id === selectedUser) {
        // Kalau admin sedang lihat chat user ini → langsung render
        renderChat(user_id);
      } else {
        // Kalau admin tidak sedang lihat → kasih notif baru
        li.classList.add("new-message");
      }
    });

    socket.on("user_left_message", ({ user_id, name }) => {
      // Hapus user dari daftar sidebar
      const li = document.getElementById(user_id);
      if (li) li.remove();
        
      // Hapus riwayat chat user dari memori kalau mau
      delete chatStorage[user_id];
      delete userNames[user_id];
        
      // Jika admin sedang lihat user ini, reset ke home
      if (selectedUser === user_id) {
        selectedUser = null;
        chatLog.innerHTML = "<div class='system-message'>Pilih user untuk memulai chat</div>";
      }
    });


    document.getElementById("admin-input").addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        sendMessage();
      }
    });