package com.bookverse.app;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import java.util.List;

public class BookAdapter extends RecyclerView.Adapter<BookAdapter.BookViewHolder> {

    public interface OnBookClickListener {
        void onBookClick(Book book);
        void onAudiobookClick(Book book);
    }

    private Context context;
    private List<Book> books;
    private OnBookClickListener listener;

    public BookAdapter(Context context, List<Book> books, OnBookClickListener listener) {
        this.context = context;
        this.books = books;
        this.listener = listener;
    }

    @NonNull
    @Override
    public BookViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_book, parent, false);
        return new BookViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull BookViewHolder holder, int position) {
        Book book = books.get(position);
        holder.titleText.setText(book.getTitle());
        holder.authorText.setText(book.getAuthor());

        // Premium Badge indicator
        if (book.isPremium()) {
            holder.premiumBadge.setVisibility(View.VISIBLE);
        } else {
            holder.premiumBadge.setVisibility(View.GONE);
        }

        // Audiobook Button state
        if (book.hasAudiobook()) {
            holder.btnPlayAudio.setVisibility(View.VISIBLE);
        } else {
            holder.btnPlayAudio.setVisibility(View.GONE);
        }

        // Listeners
        holder.itemView.setOnClickListener(v -> listener.onBookClick(book));
        holder.btnRead.setOnClickListener(v -> listener.onBookClick(book));
        holder.btnPlayAudio.setOnClickListener(v -> listener.onAudiobookClick(book));
    }

    @Override
    public int getItemCount() {
        return books.size();
    }

    public static class BookViewHolder extends RecyclerView.ViewHolder {
        TextView titleText;
        TextView authorText;
        TextView premiumBadge;
        MaterialButton btnRead;
        MaterialButton btnPlayAudio;

        public BookViewHolder(@NonNull View itemView) {
            super(itemView);
            titleText = itemView.findViewById(R.id.bookTitle);
            authorText = itemView.findViewById(R.id.bookAuthor);
            premiumBadge = itemView.findViewById(R.id.premiumBadge);
            btnRead = itemView.findViewById(R.id.btnRead);
            btnPlayAudio = itemView.findViewById(R.id.btnPlayAudio);
        }
    }
}
