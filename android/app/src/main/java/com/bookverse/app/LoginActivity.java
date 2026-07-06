package com.bookverse.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;

public class LoginActivity extends AppCompatActivity {

    private EditText emailInput;
    private EditText passwordInput;
    private MaterialButton btnSubmit;
    private MaterialButton btnTabPublic;
    private MaterialButton btnTabAdmin;
    private LinearLayout roleSelectionContainer;
    private MaterialButton btnRoleOption1;
    private MaterialButton btnRoleOption2;
    private TextView portalTitle;
    private TextView portalSubtitle;
    private View topAccentBar;

    private boolean isAdminPortal = false;
    private String selectedRole = "leitor"; // "leitor", "moderador", "super", "admin"

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        // Check active session
        SharedPreferences sharedPref = getSharedPreferences("BookVersePrefs", Context.MODE_PRIVATE);
        if (sharedPref.contains("user_id")) {
            startActivity(new Intent(LoginActivity.this, MainActivity.class));
            finish();
            return;
        }

        // Bind Views
        emailInput = findViewById(R.id.emailInput);
        passwordInput = findViewById(R.id.passwordInput);
        btnSubmit = findViewById(R.id.btnSubmit);
        btnTabPublic = findViewById(R.id.btnTabPublic);
        btnTabAdmin = findViewById(R.id.btnTabAdmin);
        roleSelectionContainer = findViewById(R.id.roleSelectionContainer);
        btnRoleOption1 = findViewById(R.id.btnRoleOption1);
        btnRoleOption2 = findViewById(R.id.btnRoleOption2);
        portalTitle = findViewById(R.id.portalTitle);
        portalSubtitle = findViewById(R.id.portalSubtitle);
        topAccentBar = findViewById(R.id.topAccentBar);

        // Tab setup
        btnTabPublic.setOnClickListener(v -> switchToPublicPortal());
        btnTabAdmin.setOnClickListener(v -> switchToAdminPortal());

        // Role option buttons
        btnRoleOption1.setOnClickListener(v -> selectRoleOption(1));
        btnRoleOption2.setOnClickListener(v -> selectRoleOption(2));

        // Submit form
        btnSubmit.setOnClickListener(v -> handleLoginSubmit());

        // Initialize default view
        switchToPublicPortal();
    }

    private void switchToPublicPortal() {
        isAdminPortal = false;
        btnTabPublic.setStrokeWidth(3);
        btnTabAdmin.setStrokeWidth(0);
        topAccentBar.setBackgroundColor(getResources().getColor(R.color.gold_amber));
        portalTitle.setText("BookVerse");
        portalSubtitle.setText("Sua biblioteca inteligente de audiobooks & PDFs");
        
        btnRoleOption1.setText("Leitor / Assinante");
        btnRoleOption2.setText("Moderador");
        selectRoleOption(1);
    }

    private void switchToAdminPortal() {
        isAdminPortal = true;
        btnTabAdmin.setStrokeWidth(3);
        btnTabPublic.setStrokeWidth(0);
        topAccentBar.setBackgroundColor(getResources().getColor(R.color.orange_admin));
        portalTitle.setText("BookVerse ADMIN");
        portalSubtitle.setText("Portal de Controle e Gerenciamento Administrativo");

        btnRoleOption1.setText("Super Admin");
        btnRoleOption2.setText("Admin Geral");
        selectRoleOption(1);
    }

    private void selectRoleOption(int optionIndex) {
        if (!isAdminPortal) {
            if (optionIndex == 1) {
                selectedRole = "leitor";
                emailInput.setText("leitor@bookverse.com");
                passwordInput.setText("123456");
                btnRoleOption1.setBackgroundColor(getResources().getColor(R.color.zinc_800));
                btnRoleOption1.setTextColor(getResources().getColor(R.color.gold_amber));
                btnRoleOption2.setBackgroundColor(getResources().getColor(R.color.black_bg));
                btnRoleOption2.setTextColor(getResources().getColor(R.color.zinc_400));
            } else {
                selectedRole = "moderador";
                emailInput.setText("moderador@bookverse.com");
                passwordInput.setText("123456");
                btnRoleOption2.setBackgroundColor(getResources().getColor(R.color.zinc_800));
                btnRoleOption2.setTextColor(getResources().getColor(R.color.gold_amber));
                btnRoleOption1.setBackgroundColor(getResources().getColor(R.color.black_bg));
                btnRoleOption1.setTextColor(getResources().getColor(R.color.zinc_400));
            }
        } else {
            if (optionIndex == 1) {
                selectedRole = "super";
                emailInput.setText("tutojose1@gmail.com");
                passwordInput.setText("123456");
                btnRoleOption1.setBackgroundColor(getResources().getColor(R.color.zinc_800));
                btnRoleOption1.setTextColor(getResources().getColor(R.color.orange_admin));
                btnRoleOption2.setBackgroundColor(getResources().getColor(R.color.black_bg));
                btnRoleOption2.setTextColor(getResources().getColor(R.color.zinc_400));
            } else {
                selectedRole = "admin";
                emailInput.setText("admin@bookverse.com");
                passwordInput.setText("123456");
                btnRoleOption2.setBackgroundColor(getResources().getColor(R.color.zinc_800));
                btnRoleOption2.setTextColor(getResources().getColor(R.color.orange_admin));
                btnRoleOption1.setBackgroundColor(getResources().getColor(R.color.black_bg));
                btnRoleOption1.setTextColor(getResources().getColor(R.color.zinc_400));
            }
        }
    }

    private void handleLoginSubmit() {
        String email = emailInput.getText().toString().trim();
        String password = passwordInput.getText().toString();

        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "E-mail e senha são obrigatórios.", Toast.LENGTH_SHORT).show();
            return;
        }

        // Mock verification based on roles and portals
        String name = "Usuário BookVerse";
        String userRole = "Moderador";
        String plan = "FREE";
        String id = "user-123";

        if ("tutojose1@gmail.com".equalsIgnoreCase(email)) {
            name = "Tuto José";
            userRole = "Super Administrador";
            plan = "PREMIUM";
            id = "demo-user";
        } else if ("admin@bookverse.com".equalsIgnoreCase(email)) {
            name = "Ana Administradora";
            userRole = "Administrador";
            plan = "PREMIUM";
            id = "admin-user";
        } else if ("moderador@bookverse.com".equalsIgnoreCase(email)) {
            name = "Marcos Moderador";
            userRole = "Moderador";
            plan = "FREE";
            id = "moderador-user";
        } else if ("leitor@bookverse.com".equalsIgnoreCase(email)) {
            name = "Lucas Leitor";
            userRole = "Leitor";
            plan = "FREE";
            id = "leitor-user";
        }

        // Strict validation for admin portal
        if (isAdminPortal) {
            boolean isAuthorized = "Super Administrador".equalsIgnoreCase(userRole) || "Administrador".equalsIgnoreCase(userRole);
            if (!isAuthorized) {
                Toast.makeText(this, "Acesso negado: Este portal é restrito para Administradores.", Toast.LENGTH_LONG).show();
                return;
            }
        }

        // Save session
        SharedPreferences sharedPref = getSharedPreferences("BookVersePrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = sharedPref.edit();
        editor.putString("user_id", id);
        editor.putString("user_name", name);
        editor.putString("user_email", email);
        editor.putString("user_role", userRole);
        editor.putString("user_plan", plan);
        editor.apply();

        Toast.makeText(this, "Login efetuado com sucesso!", Toast.LENGTH_SHORT).show();
        startActivity(new Intent(LoginActivity.this, MainActivity.class));
        finish();
    }
}
