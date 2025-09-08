class Chatbox {
  constructor() {
    this.args = {
      openButton: document.querySelector(".chatbox__button"),
      chatBox: document.querySelector(".chatbox__support"),
      sendButton: document.querySelector(".send__button"),
    };

    this.state = false;
    this.messages = [];
    this.isTalkingToAdmin = false;
    this.userInfo = null;

    this.socket = io();
    this.socket.on("user_receive", (data) => {
      this.messages.push({ name: "PiBot", message: data.message });
      this.updateChatText();
    });
  }

  display() {
    const { openButton, chatBox, sendButton } = this.args;
    
    openButton.addEventListener("click", () => this.toggleState(chatBox));

    sendButton.addEventListener("click", () => this.onSendButton(chatBox));
    
    const node = chatBox.querySelector("input");
    node.addEventListener("keyup", ({ key }) => {
      if (key === "Enter") {
        this.onSendButton(chatBox);
      }
    });

    const links = chatBox.querySelectorAll("a");
    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const message = link.textContent;
        this.sendMessage(message);
      });
    });
  }

  toggleState(chatbox) {
    this.state = !this.state;
    chatbox.classList.toggle("chatbox--active", this.state);
  }

  onSendButton(chatbox) {
    const textField = chatbox.querySelector("input");
    let text1 = textField.value.trim();
    if (text1 === "") return;

    this.messages.push({ name: "User", message: text1 });
    this.updateChatText();

    if (this.isTalkingToAdmin && this.userInfo) {
       this.socket.emit("user_message", {
        user_id: this.userInfo.user_id,
        name: this.userInfo.name,
        npm : this.userInfo.npm,
        email: this.userInfo.email,
        message: text1,
      });
      textField.value = "";
      return;
    }



    // Cek jika pesan adalah pengiriman form
    if (text1.includes("Kirim")) {
      const form = chatbox.querySelector("form");
      event.preventDefault();
      const formData = new FormData(form);

      const nama = document.getElementById("nama").value.trim();
      const email = document.getElementById("email").value.trim();
      const no_telp = document.getElementById("no_telp").value.trim();
      const pertanyaan = document.getElementById("pertanyaan").value.trim();
      if (!nama || !email || !no_telp || !pertanyaan) {
        alert("Semua field wajib diisi sebelum mengirim!");
        return;
      }
    
      fetch("http://127.0.0.1:5000/kontak_email", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.status === "success") {
            alert("Email berhasil dikirim!");
            form.reset();
            window.location.href = "/";
          } else {
            alert("Gagal mengirim: " + data.message);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("Terjadi kesalahan saat mengirim email.");
        });
    }



    fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      body: JSON.stringify({ message: text1 }),
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((r) => r.json())
      .then((r) => {
        let msg;
      
        if (r.answer && typeof r.answer === "object" && r.answer.follow_up) {
          let followUpText =
            r.answer.text + "\n" + r.answer.follow_up.join("\n");
          msg = { name: "PiBot", message: followUpText };
        } else {
          msg = { name: "PiBot", message: r.answer };
        }
      
        this.messages.push(msg);
        this.updateChatText();
        textField.value = "";
      })
      .catch((error) => {
        console.error("Error:", error);
        this.updateChatText();
        textField.value = "";
      });
  }

  sendMessage(message) {
    const textField = this.args.chatBox.querySelector("input");
    textField.value = message;
    this.onSendButton(this.args.chatBox);
  }

  async submitUserInfo() {
  const name = document.getElementById("user_name").value.trim();
  const npm = document.getElementById("user_npm").value.trim();
  const email = document.getElementById("user_email").value.trim();
  if (!name || !npm || !email) {
    alert("Nama dan email wajib diisi.");
    return;
  }

  // 🔎 Ambil status admin dari backend
  let data;
  try {
    const res = await fetch("/admin/availability", { cache: "no-store" });
    data = await res.json();
  } catch (err) {
    alert("Gagal mengecek status admin. Silakan coba lagi.");
    return;
  }

  // 🚫 Jika admin offline, hentikan
  if (!data.online) {
    alert(`Admin sedang offline. Jam kerja: ${data.hours}`);
    return;
  }

  // ✅ Kalau admin online, baru lanjut
  this.userInfo = { name, npm, email, user_id: npm };
  this.socket.emit("user_register", this.userInfo);
  this.isTalkingToAdmin = true;

  // Hapus bubble form terakhir (yang berisi input nama/email)
  this.messages.pop();

  // Tambahkan pesan bahwa user terhubung
  this.messages.push({
    name: "PiBot",
    message: `Halo ${name}, Anda sekarang terhubung dengan admin. Jika ingin keluar, klik tombol di bawah ini:<br>
      <button class="btn btn-sm btn-danger mt-2" onclick="chatbox.exitAdmin()">Keluar dari Admin</button>`
  });
  this.updateChatText();
}



  kembaliKePertanyaan() {
    this.messages = [];
    const kembaliMsg = {
      name: "PiBot",
      message: `
      Hai, ada yang bisa PiBot bantu? Silakan pilih pertanyaan:<br />
      1. <a href="#" data-message="Apa itu Prodi Informatika Gunadarma?">Apa itu Prodi Informatika Gunadarma?</a><br />
      2. <a href="#" data-message="Apa keunggulan Prodi Informatika Gunadarma?">Apa keunggulan Prodi Informatika Gunadarma?</a><br />
      3. <a href="#" data-message="Apa tujuan Prodi Informatika?">Apa tujuan Prodi Informatika?</a><br />
      4. <a href="#" data-message="Prospek kerja lulusan Informatika?">Prospek kerja lulusan Informatika?</a><br />
      5. <a href="#" data-message="Kurikulum Prodi Informatika?">Kurikulum Prodi Informatika?</a><br />
      6. <a href="#" data-message="Kontak Admin">Kontak Admin</a>
      `
    };
    this.messages.push(kembaliMsg);
    this.updateChatText();
  }

  updateChatText() {
    let html = "";
    this.messages.slice().reverse().forEach((item) => {
      const cls = item.name === "PiBot"
        ? "messages__item--visitor"
        : "messages__item--operator";
      html += `<div class="messages__item ${cls}">${item.message}</div>`;
    });

    const chatMessage = this.args.chatBox.querySelector(".chatbox__messages");
    chatMessage.innerHTML = html;

    // Bind ulang link klik
    const links = chatMessage.querySelectorAll("a");
    links.forEach(link => {
      link.addEventListener('click', () => {
        const message = link.getAttribute('data-message');
  
        // Kosongkan input (jika perlu)
        const textField = this.args.chatBox.querySelector("input");
        if (textField) textField.value = '';
  
        // Kirim pesan langsung (sama seperti saat user mengetik)
        this.sendMessage(message);
        });
    });

    function renderChat(userId) {
      chatLog.innerHTML = "";
      const logs = chatStorage[userId] || [];

      logs.forEach(entry => {
        const wrapper = document.createElement("div");
        wrapper.className = "message-wrapper " + entry.from;

        const div = document.createElement("div");
        div.className = "message " + entry.from;
        div.textContent = (entry.from === "admin" ? "Admin: " : userNames[userId] + ": ") + entry.text;

        wrapper.appendChild(div);
        chatLog.appendChild(wrapper);
      });

    chatLog.scrollTop = chatLog.scrollHeight;
    };
    
  }
  exitAdmin() {
    this.socket.emit("user_exit_admin", {
      user_id: this.userInfo?.user_id, // tambahkan ini
      name: this.userInfo?.name,
      email: this.userInfo?.email
    });
  
    this.isTalkingToAdmin = false;
    this.userInfo = null;
    this.messages.push({
      name: "PiBot",
      message: "Anda telah keluar dari mode kontak admin. Silakan <a href='#' data-message='Kembali ke Pertanyaan'><b>Kembali ke pertanyaan</b></a>."
    });
    this.updateChatText();
  }

}

const chatbox = new Chatbox();
chatbox.display();
