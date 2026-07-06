package com.bookverse.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import java.util.ArrayList;
import java.util.List;

public class AdminPanelActivity extends AppCompatActivity {

    private TextView txtStatsBooks;
    private TextView txtStatsUsers;
    private EditText editNewBookTitle;
    private EditText editNewBookAuthor;
    private MaterialButton btnAddBook;
    private ListView listUsersView;
    private MaterialButton btnBack;

    private List<String> userList;
    private ArrayAdapter<String> userAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_panel);

        // Security role-based protection block on creation
        SharedPreferences sharedPref = getSharedPreferences("BookVersePrefs", Context.MODE_PRIVATE);
        String userRole = sharedPref.getString("user_role", "Leitor");
        
        boolean isAuthorized = "Super Administrador".equalsIgnoreCase(userRole) || "Administrador".equalsIgnoreCase(userRole);
        if (!isAuthorized) {
            Toast.makeText(this, "Acesso Proibido! Redirecionando...", Toast.LENGTH_LONG).show();
            finish(); // expel immediately from activity stack!
            return;
        }

        // Bind Views
        txtStatsBooks = findViewById(R.id.txtStatsBooks);
        txtStatsUsers = findViewById(R.id.txtStatsUsers);
        editNewBookTitle = findViewById(R.id.editNewBookTitle);
        editNewBookAuthor = findViewById(R.id.editNewBookAuthor);
        btnAddBook = findViewById(R.id.btnAddBook);
        listUsersView = findViewById(R.id.listUsersView);
        btnBack = findViewById(R.id.btnBack);

        // Fill Stats
        txtStatsBooks.setText("Livros Cadastrados: 4");
        txtStatsUsers.setText("Usuários Ativos: 4");

        // Load list of registered users
        initUsersList();

        btnBack.setOnClickListener(v -> finish());

        btnAddBook.setOnClickListener(v -> {
            String title = editNewBookTitle.getText().toString().trim();
            String author = editNewBookAuthor.getText().toString().trim();

            if (title.isEmpty() || author.isEmpty()) {
                Toast.makeText(this, "Preencha o título e autor.", Toast.LENGTH_SHORT).show();
                return;
            }

            // Mock book insertion
            Toast.makeText(this, "Livro '" + title + "' cadastrado com sucesso!", Toast.LENGTH_LONG).show();
            editNewBookTitle.setText("");
            editNewBookAuthor.setText("");
            txtStatsBooks.setText("Livros Cadastrados: 5");
        });
    }

    private void initUsersList() {
        userList = new ArrayList<>();
        userList.add("Tuto José - Super Administrador (tutojose1@gmail.com)");
        userList.add("Ana Administradora - Administrador (admin@bookverse.com)");
        userList.add("Marcos Moderador - Moderador (moderador@bookverse.com)");
        userList.add("Lucas Leitor - Leitor (leitor@bookverse.com)");

        userAdapter = new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, userList);
        listUsersView.setAdapter(userAdapter);
    }
}
