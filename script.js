const API_URL = "http://localhost:3000";
let currentUser = JSON.parse(localStorage.getItem("user"));
let allUsers = [];


document.addEventListener("DOMContentLoaded", async () => {
    await fetchUsers();
    if (currentUser) {
        showListView();
    } else {
        showLoginView();
    }
});


function showLoginView() {
    hideAllViews();
    document.getElementById("login-view").classList.remove("hidden");
    document.getElementById("navbar").classList.add("hidden");
    populateUserDropdown();
}

function showListView() {
    hideAllViews();
    document.getElementById("list-view").classList.remove("hidden");
    document.getElementById("navbar").classList.remove("hidden");
    updateUserDisplay();
    fetchNews();
}

function showCreateView() {
    hideAllViews();
    document.getElementById("form-view").classList.remove("hidden");
    document.getElementById("form-title").innerText = "Create News";
    document.getElementById("news-id").value = "";
    document.getElementById("news-title").value = "";
    document.getElementById("news-body").value = "";
}

function showEditView(news) {
    hideAllViews();
    document.getElementById("form-view").classList.remove("hidden");
    document.getElementById("form-title").innerText = "Edit News";
    document.getElementById("news-id").value = news.id;
    document.getElementById("news-title").value = news.title;
    document.getElementById("news-body").value = news.body;
}

function showDetailView(news) {
    hideAllViews();
    document.getElementById("detail-view").classList.remove("hidden");
    renderDetail(news);
}

function hideAllViews() {
    document.getElementById("login-view").classList.add("hidden");
    document.getElementById("list-view").classList.add("hidden");
    document.getElementById("form-view").classList.add("hidden");
    document.getElementById("detail-view").classList.add("hidden");
}

function logout() {
    localStorage.removeItem("user");
    currentUser = null;
    showLoginView();
}

function updateUserDisplay() {
    if (currentUser) {
        document.getElementById("user-display").innerText = `Logged in as: ${currentUser.name}`;
    }
}


async function fetchUsers() {
    const res = await fetch(`${API_URL}/users`);
    allUsers = await res.json();
}

function populateUserDropdown() {
    const select = document.getElementById("user-select");
    select.innerHTML = '<option value="">-- Select User --</option>';
    allUsers.forEach(user => {
        const option = document.createElement("option");
        option.value = user.id;
        option.innerText = user.name;
        select.appendChild(option);
    });
}

function handleLogin() {
    const userId = document.getElementById("user-select").value;
    if (!userId) return alert("Please select a user");
    
    currentUser = allUsers.find(u => u.id == userId);
    localStorage.setItem("user", JSON.stringify(currentUser));
    showListView();
}

function getUserName(id) {
    const user = allUsers.find(u => u.id == id);
    return user ? user.name : "Unknown";
}


async function fetchNews() {
    const res = await fetch(`${API_URL}/news`);
    let newsList = await res.json();
    
   
    const query = document.getElementById("search-box").value.toLowerCase();
    if(query) {
        newsList = newsList.filter(n => n.title.toLowerCase().includes(query));
    }

    renderNewsList(newsList);
}

function filterNews() {
    fetchNews(); 
}

function renderNewsList(newsList) {
    const container = document.getElementById("news-container");
    container.innerHTML = "";
    
    newsList.forEach(news => {
        const isAuthor = currentUser && news.author_id == currentUser.id;
        const div = document.createElement("div");
        div.className = "news-card";
        div.innerHTML = `
            <h3>${news.title}</h3>
            <div class="news-meta">
                By <strong>${getUserName(news.author_id)}</strong> | Comments: ${news.comments.length}
            </div>
            <div class="news-actions">
                <button class="btn-primary" onclick="loadNewsDetail(${news.id})">View Details</button>
                ${isAuthor ? `
                    <button class="btn-primary" onclick='loadEditForm(${JSON.stringify(news)})'>Edit</button>
                    <button class="btn-delete" onclick="deleteNews(${news.id})">Delete</button>
                ` : ""}
            </div>
        `;
        container.appendChild(div);
    });
}

async function handleNewsSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("news-id").value;
    const title = document.getElementById("news-title").value;
    const body = document.getElementById("news-body").value;

    // Validation 
    if (body.length < 20) return alert("Body must be at least 20 characters.");

    const newsData = {
        title,
        body,
        author_id: currentUser.id,
        
    };

    if (id) {
        
        await fetch(`${API_URL}/news/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, body }) 
        });
    } else {
       
        newsData.comments = [];
        await fetch(`${API_URL}/news`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newsData)
        });
    }
    showListView();
}

async function deleteNews(id) {
    if(!confirm("Are you sure?")) return;
    
    await fetch(`${API_URL}/news/${id}`, { method: "DELETE" });
    fetchNews();
}

function loadEditForm(news) {
   
    if(news.author_id !== currentUser.id) return alert("Unauthorized");
    showEditView(news);
}


let currentNewsItem = null;

async function loadNewsDetail(id) {
    const res = await fetch(`${API_URL}/news/${id}`); 
    currentNewsItem = await res.json();
    showDetailView(currentNewsItem);
}

function renderDetail(news) {
    const contentDiv = document.getElementById("detail-content");
    contentDiv.innerHTML = `
        <h2>${news.title}</h2>
        <p class="news-meta">By ${getUserName(news.author_id)}</p>
        <p>${news.body}</p>
    `;

    const commentsList = document.getElementById("comments-list");
    commentsList.innerHTML = "";
    news.comments.forEach(c => {
        commentsList.innerHTML += `
            <div class="comment">
                <strong>${getUserName(c.user_id)}</strong> <small>(${new Date(c.timestamp).toLocaleString()})</small>
                <p>${c.text}</p>
            </div>
        `;
    });
}

async function submitComment() {
    const text = document.getElementById("comment-text").value;
    if (!text) return alert("Comment cannot be empty"); 

    const newComment = {
        id: Date.now(), 
        text: text,
        user_id: currentUser.id, 
        timestamp: new Date().toISOString()
    };

   
    const updatedComments = [...currentNewsItem.comments, newComment];

   
    await fetch(`${API_URL}/news/${currentNewsItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments: updatedComments })
    });

    document.getElementById("comment-text").value = "";
    loadNewsDetail(currentNewsItem.id); 
}