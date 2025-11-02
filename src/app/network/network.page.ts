import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PostService, Post } from '../services/post.service';
import { NewPostModalComponent } from './new-post-modal/new-post-modal.component';
import { Auth } from '@angular/fire/auth';

interface PostDisplay extends Post {
  liked: boolean;
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
export class NetworkPage implements OnInit, OnDestroy {
  searchQuery = '';
  
  // Current user info from Google SSO
  currentUserId = '';
  currentUserName = '';
  currentUserPhoto = '';

  allPosts: PostDisplay[] = [];
  filteredPosts: PostDisplay[] = [];
  
  private postsSubscription?: Subscription;

  constructor(
    private modalCtrl: ModalController,
    private postService: PostService,
    private auth: Auth
  ) {}

  ngOnInit() {
    // Get current user info from Google SSO
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.currentUserId = user.uid;
        this.currentUserName = user.displayName || 'Anonymous';
        this.currentUserPhoto = user.photoURL || '';
        
        // Subscribe to real-time posts
        this.subscribeToPost();
      }
    });
  }

  ngOnDestroy() {
    this.postsSubscription?.unsubscribe();
  }

  /**
   * Subscribe to real-time posts from Firestore
   */
  private subscribeToPost() {
    this.postsSubscription = this.postService.getPosts().subscribe({
      next: (posts) => {
        // Transform posts to include UI state
        this.allPosts = posts.map((post) => ({
          ...post,
          liked: post.likes.includes(this.currentUserId),
          showComments: false,
          newComment: '',
        }));
        this.refreshFeed();
      },
      error: (error) => {
        console.error('Error fetching posts:', error);
      },
    });
  }

  /**
   * Filter posts based on search query
   */
  onSearchChange(query: string) {
    if (!query.trim()) {
      this.filteredPosts = [...this.allPosts];
      return;
    }

    const lowerQuery = query.toLowerCase();
    this.filteredPosts = this.allPosts.filter(
      (p) =>
        p.caption.toLowerCase().includes(lowerQuery) ||
        p.userName.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Open modal to create new post
   */
  async openNewPostModal() {
    const modal = await this.modalCtrl.create({
      component: NewPostModalComponent,
      cssClass: 'full-screen-modal',
      showBackdrop: true,
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.caption) {
      await this.createPost(data.caption, data.photoURL);
    }
  }

  /**
   * Create a new post in Firestore
   */
  async createPost(caption: string, photoURL?: string) {
    try {
      await this.postService.createPost({
        userId: this.currentUserId,
        userName: this.currentUserName,
        userPhoto: this.currentUserPhoto,
        caption: caption,
        photoURL: photoURL,
      });
      // Post will automatically appear in feed via real-time subscription
    } catch (error) {
      console.error('Error creating post:', error);
    }
  }

  /**
   * Toggle like on a post
   */
  async toggleLike(post: PostDisplay) {
    if (!post.id) return;

    try {
      // Optimistic UI update
      post.liked = !post.liked;
      
      // Update in Firestore
      await this.postService.toggleLike(post.id, this.currentUserId, !post.liked);
      
      // The real-time listener will update the actual like count
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      post.liked = !post.liked;
    }
  }

  /**
   * Toggle comments visibility
   */
  toggleComments(post: PostDisplay) {
    post.showComments = !post.showComments;
  }

  /**
   * Add a comment to a post
   */
  async addComment(post: PostDisplay) {
    if (!post.newComment?.trim() || !post.id) return;

    try {
      await this.postService.addComment(post.id, {
        userName: this.currentUserName,
        userPhoto: this.currentUserPhoto,
        text: post.newComment,
      });

      // Clear input
      post.newComment = '';
      
      // Comment will automatically appear via real-time subscription
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }

  /**
   * Get like count for display
   */
  getLikeCount(post: PostDisplay): number {
    return post.likes?.length || 0;
  }

  /**
   * Get comment count for display
   */
  getCommentCount(post: PostDisplay): number {
    return post.comments?.length || 0;
  }

  /**
   * Refresh and sort feed
   */
  private refreshFeed() {
    this.filteredPosts = [...this.allPosts];
  }
}