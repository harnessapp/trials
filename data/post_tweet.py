# post_tweet.py
import tweepy
from todaysfirst import tweet_text  # Import the generated tweet text

# ---- Replace these with your keys from the developer console ----
API_KEY = "NsOr3mBMkS0LD7yl3yzLZzFeU"
API_SECRET_KEY = "miMWJ05SBQBCMVqmC80HxIGigOqdZln5QO9wRwcnIkJ3VkIm1N"
ACCESS_TOKEN = "2035629429331046400-RGrJz3EVvEYY4I3nZIkkbzvGxYSHqR"
ACCESS_TOKEN_SECRET = "GfLXQ91rZMOxh5xTOzhvQFzuXLl9ATUOyvdfj320a2SuE"
BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAAKG58gEAAAAAEuuEihzi%2BMHKg4gyZdII9b2G29Q%3DOJiy9erpBSXhMAiRMKAFmNtzqKtdAMpvgbfAwagI1dJi5tFrdQ"

# Authenticate with Tweepy v2
client = tweepy.Client(
    consumer_key=API_KEY,
    consumer_secret=API_SECRET_KEY,
    access_token=ACCESS_TOKEN,
    access_token_secret=ACCESS_TOKEN_SECRET,
    bearer_token=BEARER_TOKEN
)

# Post the tweet
response = client.create_tweet(text=tweet_text)
print("Tweet posted! ID:", response.data["id"])