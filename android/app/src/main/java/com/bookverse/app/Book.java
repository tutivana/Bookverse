package com.bookverse.app;

public class Book {
    private String id;
    private String title;
    private String author;
    private String coverUrl;
    private String description;
    private boolean isPremium;
    private boolean hasAudiobook;
    private int progressPercentage;
    private String status; // "Active" or "Draft"

    public Book(String id, String title, String author, String coverUrl, String description, boolean isPremium, boolean hasAudiobook, String status) {
        this.id = id;
        this.title = title;
        this.author = author;
        this.coverUrl = coverUrl;
        this.description = description;
        this.isPremium = isPremium;
        this.hasAudiobook = hasAudiobook;
        this.progressPercentage = 0;
        this.status = status;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getAuthor() { return author; }
    public String getCoverUrl() { return coverUrl; }
    public String getDescription() { return description; }
    public boolean isPremium() { return isPremium; }
    public boolean hasAudiobook() { return hasAudiobook; }
    public int getProgressPercentage() { return progressPercentage; }
    public void setProgressPercentage(int progress) { this.progressPercentage = progress; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
