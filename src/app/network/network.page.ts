import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { NewPostModalComponent } from './new-post-modal/new-post-modal.component';

interface Post {
  id: string;
  userName: string;
  userPhoto?: string;
  caption: string;
  photoURL?: string;
  likes: number;
  liked: boolean;
  comments: { userName: string; text: string }[];
  timestamp: Date;
  showComments?: boolean;
  newComment?: string;
}

@Component({
  selector: 'app-network',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './network.page.html',
  styleUrls: ['./network.page.scss'],
})
export class NetworkPage implements OnInit {
  searchQuery = '';
  currentUserName = 'Feda Abdelghany';
  currentUserPhoto = 'assets/profilepics/khalid_samaka.jpg';

  newPost: Partial<Post> = { caption: '', photoURL: '' };
  allPosts: Post[] = [];
  filteredPosts: Post[] = [];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    // ✅ Dummy Feed Data
    this.allPosts = [
      {
        id: '1',
        userName: 'Ahmed Youssef',
        userPhoto: 'assets/profilepics/adham_elmahdy.jpeg',
        caption: 'Excited to be part of the Holcim sustainability workshop this week! 🌿',
        photoURL: 'assets/zuhra.jpg',
        likes: 12,
        liked: false,
        comments: [
          { userName: 'Sara Ali', text: 'Looks great!' },
          { userName: 'Mohamed Nabil', text: 'See you there!' },
        ],
        timestamp: new Date('2025-10-20T09:00:00'),
      },
      {
        id: '2',
        userName: 'Leila Mansour',
        userPhoto: 'assets/profilepics/ali_said.jpeg',
        caption:
          'Another successful day at the Sokhna Plant – proud of our team’s performance and teamwork! 💪',
        photoURL: 'assets/mall.webp',
        likes: 23,
        liked: false,
        comments: [{ userName: 'Omar Farouk', text: 'Amazing results, Leila!' }],
        timestamp: new Date('2025-10-21T14:30:00'),
      },
      {
        id: '3',
        userName: 'John Anderson',
        userPhoto: 'assets/profilepics/grant_earnshaw.jpg',
        caption: 'Innovation is at the core of what we do. Testing new green materials today!',
        photoURL: 'assets/palm.jpg',
        likes: 18,
        liked: false,
        comments: [],
        timestamp: new Date('2025-10-22T11:45:00'),
      },
    ];

    this.refreshFeed();
  }

  /** 🔍 Filter Posts */
  onSearchChange(query: string) {
    this.filteredPosts = this.allPosts.filter(
      (p) =>
        p.caption.toLowerCase().includes(query.toLowerCase()) ||
        p.userName.toLowerCase().includes(query.toLowerCase())
    );
  }

  /** 🆕 Create Post directly */
  createPost() {
    if (!this.newPost.caption?.trim()) return;

    const newPost: Post = {
      id: (this.allPosts.length + 1).toString(),
      userName: this.currentUserName,
      userPhoto: this.currentUserPhoto,
      caption: this.newPost.caption,
      photoURL: this.newPost.photoURL,
      likes: 0,
      liked: false,
      comments: [],
      timestamp: new Date(),
    };

    this.allPosts.unshift(newPost);
    this.refreshFeed();
    this.newPost = { caption: '', photoURL: '' };
  }

  /** ❤️ Like / Unlike */
  toggleLike(post: Post) {
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
  }

  /** 💬 Show / Hide Comments */
  toggleComments(post: Post) {
    post.showComments = !post.showComments;
  }

  /** ➕ Add Comment */
  addComment(post: Post) {
    if (!post.newComment?.trim()) return;
    post.comments.push({
      userName: this.currentUserName,
      text: post.newComment,
    });
    post.newComment = '';
  }

  /** 🧭 Open Fullscreen Modal for New Post */
async openNewPostModal() {
  const modal = await this.modalCtrl.create({
    component: NewPostModalComponent,
    cssClass: 'full-screen-modal',
    showBackdrop: true,
  });

  await modal.present();

  const { data } = await modal.onDidDismiss();
  if (data) {
    const newPost = {
      id: (this.allPosts.length + 1).toString(),
      userName: this.currentUserName,
      userPhoto: this.currentUserPhoto,
      caption: data.caption,
      photoURL: data.photoURL,
      likes: 0,
      liked: false,
      comments: [],
      timestamp: new Date(),
    };
    this.allPosts.unshift(newPost);
    this.filteredPosts = [...this.allPosts];
  }
}

  /** 🔄 Helper: Refresh and Sort Feed */
  private refreshFeed() {
    this.allPosts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.filteredPosts = [...this.allPosts];
  }
}
