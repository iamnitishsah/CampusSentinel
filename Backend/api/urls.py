from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'profiles', views.ProfileViewSet, basename='profile')

urlpatterns = [
    path('', include(router.urls)),
    path("entities/", views.EntitySearchAPIView.as_view(), name="entity-search"),
    path("entities/<str:entity_id>/", views.ProfileDetailAPIView.as_view(), name="entity-detail"),
    path("alerts/", views.AlertsListAPIView.as_view(), name="alerts-list"),
    path("entities/<str:entity_id>/timeline/", views.TimelineDetailAPIView.as_view(), name="entity-timeline-detail"),
    path("search/face/", views.FaceSearchAPIView.as_view(), name="face-search"),
    path("predict/", views.PredictionAPIView.as_view(), name="predict-location"),
    path("forecast/", views.OccupancyAPIView.as_view(), name="forecast-count"),
]