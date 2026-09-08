コエフォト GitHub更新用 v28

目的
- 既存 v27 の作成画面／メッセージカード側を維持
- ボイスページだけ、今回固定した Classic Birthday デザインへ差し替え
- 写真と音声は既存の sessionStorage + IndexedDB プレビュー方式をそのまま利用
- ボイスページには閲覧期限を表示しない
- カード外に「コエフォト」「A PHOTO, A VOICE, A MEMORY.」を表示

このZIPに入っているファイル
- index.html
- koephoto-create-v28.html
- koephoto-preview-v28.html
- classic-birthday-voice-v6-preview.html
- koefoto_classic_birthday_overlay.png
- vercel.json

重要
既存GitHubリポジトリにある以下のメッセージカード用素材は削除しないでください。
- classic-birthday-message.png
- classic-birthday-decor-overlay.png

アップロード方法
1. GitHubのこれまで使っていたコエフォトのリポジトリを開く
2. 上記ファイルを同じ階層へ追加／上書きする
3. Commit changes
4. Vercelの自動デプロイ完了を待つ
5. index.html → 作成 → プレビューを確認

今回、Supabaseの voice-card-public Edge Function はまだ変更していません。
まずGitHub/Vercel側で固定デザインの表示を確認し、その後、本番QRの公開先をこのデザインへ接続します。
