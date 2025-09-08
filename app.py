from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from flask_mail import Mail, Message
from chat import get_response
from datetime import datetime

app = Flask(__name__)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = 'senderibot@gmail.com'
app.config['MAIL_PASSWORD'] = 'zrom adjv ohwp htcy'

app.secret_key = "my_super_secret_key_123"  # <== tambahkan ini

mail = Mail(app)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Simpan data user yang masuk (sesi sederhana)
active_users = {}

@app.route("/")
def index():
    return render_template("base.html")

@app.route("/admin")
def admin_chat():
    if not session.get("admin_logged_in"):
        return redirect(url_for("admin_login"))
    return render_template("admin_chat.html", users=active_users)

@app.route("/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        # Contoh hardcode, bisa diganti database
        if username == "admin" and password == "123":
            session["admin_logged_in"] = True
            return """
                <script>
                    window.location.href = "/admin";
                </script>
            """
            # alert("Anda berhasil login!");
            # return redirect(url_for("admin_chat"))
       
        else:
            return """
                <script>
                    alert("Username atau password salah!");
                    window.location.href = "/login";
                </script>
            """

    return """
        <form method="POST" style="margin:150px auto; width:400px; text-align:center;">
            <h2>Admin Login</h2>
            <input type="text" name="username" placeholder="Username" required/><br/><br/>
            <input type="password" name="password" placeholder="Password" required/><br/><br/> 
            <button type="submit">Login</button>
            <br></br>
            <a href="/" class="home-btn">Home</a>
        </form>
        <style>
        .home-btn {
            display: inline-block;
            background: #4f86ce;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
        }
        
        .home-btn:hover {
            background: #91a8c7;
        }
    </style>
    """

@app.route("/logout")
def admin_logout():
    session.pop("admin_logged_in", None)
    return """
        <script>
            window.location.href = "/login";
        </script>
    """
    # alert("Anda telah logout!");

@app.post("/predict")
def predict():
    text = request.get_json().get("message")
    response = get_response(text)
    return jsonify({"answer": response})

@app.post("/register_user")
def register_user():
    data = request.get_json()
    user_id = data.get("user_id")
    name = data.get("name")
    npm = data.get("npm")
    email = data.get("email")
    if user_id and name:
        active_users[user_id] = {"name": name, "npm": npm , "email": email}
        return jsonify({"status": "ok"}), 200
    return jsonify({"status": "failed"}), 400

# Real-time events
@socketio.on('admin_reply')
def handle_admin_reply(data):
    to_user = data.get("to")
    message = data.get("message")
    if to_user in active_users and "sid" in active_users[to_user]:
        emit('user_receive', {
            "message": message
        }, room=active_users[to_user]["sid"])

@socketio.on('connect')
def handle_connect():
    print(f"User connected: {request.sid}")

@socketio.on('user_message')
def handle_user_message(data):
    user_id = data.get("user_id")
    message = data.get("message")
    name = data.get("name")
    npm = data.get("npm")
    email = data.get("email")

    # Simpan user + sid
    active_users[user_id] = {
        "name": name,
        "npm": npm,
        "email": email,
        "sid": request.sid
    }

    emit('admin_receive', {
        "user_id": user_id,
        "message": message,
        "name": name,
        "npm": npm,
        "email": email
    }, broadcast=True)

@socketio.on("user_exit_admin")
def handle_user_exit_admin(data):
    user_id = data.get("user_id") or data.get("email")  # fallback ke email
    name = data.get("name")

    print(f"[INFO] {name} keluar dari admin.")

    if user_id in active_users:
        del active_users[user_id]

    # Kirim ke admin agar tahu user keluar
    emit("user_left_message", {
        "user_id": user_id,
        "name": name
    }, broadcast=True)  # broadcast ke semua admin

@app.post("/kontak_email")
def kontak_email():
    try:
        nama = request.form.get('nama', '').strip()
        email = request.form.get('email', '').strip()
        no_telp = request.form.get('no_telp', '').strip()
        pertanyaan = request.form.get('pertanyaan', '').strip()

        if not nama or not email or not no_telp or not pertanyaan:
            return """
                <script>
                    alert("Semua field wajib diisi!");
                    window.location.href = "/";
                </script>
            """

        msg = Message('Pertanyaan dari Pengguna', 
                      sender='senderibot@gmail.com', 
                      recipients=['senderibot@gmail.com'],
                      reply_to=email   
                      )
        
        msg.body = f'Nama: {nama}\nEmail: {email}\nNo. Telp: {no_telp}\nPertanyaan: {pertanyaan}'

        mail.send(msg)
        
        return """
                    <script>
                        alert("Email berhasil dikirim!");
                        window.location.href = "/";
                    </script>
                """ 
    
    except Exception as e:
        return f"""
            <script>
                alert("Terjadi error: {str(e)}");
                window.location.href = "/";
            </script>
        """

def is_admin_online():
    now = datetime.now().time()
    start = datetime.strptime("09:00", "%H:%M").time()
    end = datetime.strptime("15:00", "%H:%M").time()
    return start <= now <= end

@app.route("/chat_admin", methods=["POST"])
def ask_admin():
    if not is_admin_online():
        return {"status": "offline", "message": "Admin sedang offline. Silakan hubungi pada jam 09.00-11.30 atau 13.00-15.00"}
    
    # kalau online → lanjutkan proses kirim pertanyaan ke admin
    data = request.json
    user_message = data.get("message")
    
    # contoh respons sementara
    # return {"status": "online", "message": f"Pesanmu sudah dikirim ke admin: {user_message}"}
    
@app.route("/admin/availability")
def admin_availability():
    now = datetime.now()
    hour = now.hour
    online = 9 <= hour < 15  # jam 09:00–15:00

    return jsonify({
        "online": online,
        "hours": "09.00 - 15.00"
    })

if __name__ == "__main__":
    socketio.run(app, debug=True)