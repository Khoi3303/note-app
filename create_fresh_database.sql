use master
go
drop database FinalProject_NoteApp
go
create database FinalProject_NoteApp
go
use FinalProject_NoteApp
go

-- Bảng Users giữ nguyên
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name NVARCHAR(255) NOT NULL,
    avatar_color NVARCHAR(50) DEFAULT 'blue',
    email_verified BIT DEFAULT 0,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_otp VARCHAR(6),
    reset_expires DATETIME,
    created_at DATETIME DEFAULT GETDATE()
);

-- Bảng Notes giữ nguyên
CREATE TABLE Notes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    title NVARCHAR(255) NOT NULL DEFAULT '',
    content NVARCHAR(MAX),
    is_pinned BIT DEFAULT 0,
    pinned_at DATETIME,
    note_password NVARCHAR(255),
    last_edited_by NVARCHAR(255),
    last_edited_at DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Notes_Users
    FOREIGN KEY (user_id)
    REFERENCES Users(id)
    ON DELETE CASCADE
);
CREATE INDEX IDX_Notes_UserId ON Notes(user_id);

-- Bảng Images giữ nguyên
CREATE TABLE Images (
    id INT IDENTITY(1,1) PRIMARY KEY,
    note_id INT NOT NULL,
    image_url NVARCHAR(MAX) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Images_Notes FOREIGN KEY (note_id) REFERENCES Notes(id) ON DELETE CASCADE
);
CREATE INDEX IDX_Images_NoteId ON Images(note_id);

-- Bảng Labels giữ nguyên
CREATE TABLE Labels (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Labels_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT UQ_Labels_UserIdName UNIQUE (user_id, name)
);
CREATE INDEX IDX_Labels_UserId ON Labels(user_id);

-- Bảng NoteLabels giữ nguyên
CREATE TABLE NoteLabels (
    note_id INT NOT NULL,
    label_id INT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (note_id, label_id),
    CONSTRAINT FK_NoteLabels_Notes FOREIGN KEY (note_id) REFERENCES Notes(id) ON DELETE CASCADE,
    CONSTRAINT FK_NoteLabels_Labels FOREIGN KEY (label_id) REFERENCES Labels(id) ON DELETE NO ACTION
);

-- Bảng Shares: ĐÃ SỬA CHỖ FK_Shares_SharedBy
CREATE TABLE Shares (
    id INT IDENTITY(1,1) PRIMARY KEY,
    note_id INT NOT NULL,
    shared_by_user_id INT NOT NULL,
    shared_with_email NVARCHAR(255) NOT NULL,
    permission NVARCHAR(10) NOT NULL CHECK (permission IN ('read', 'edit')),
    shared_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Shares_Notes FOREIGN KEY (note_id) REFERENCES Notes(id) ON DELETE CASCADE,
    -- Chuyển từ CASCADE thành NO ACTION để tránh lỗi cycle
    CONSTRAINT FK_Shares_SharedBy FOREIGN KEY (shared_by_user_id) REFERENCES Users(id) ON DELETE NO ACTION 
);
CREATE INDEX IDX_Shares_NoteId ON Shares(note_id);
CREATE INDEX IDX_Shares_SharedWithEmail ON Shares(shared_with_email);

SELECT * FROM Users