package com.bookverse.app;

public class User {
    private String id;
    private String name;
    private String email;
    private String role; // "Super Administrador" | "Administrador" | "Moderador"
    private String plan; // "FREE" | "PREMIUM"
    private String avatarUrl;

    public User(String id, String name, String email, String role, String plan, String avatarUrl) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.plan = plan;
        this.avatarUrl = avatarUrl;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public String getPlan() { return plan; }
    public String getAvatarUrl() { return avatarUrl; }

    public boolean isAdmin() {
        return "Super Administrador".equalsIgnoreCase(role) || "Administrador".equalsIgnoreCase(role);
    }
}
