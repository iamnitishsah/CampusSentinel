from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()


router.register(r'profiles', views.ProfileViewSet, basename='profile')

urlpatterns = [
    path('', include(router.urls)),
    path("entities/", views.EntitySearchAPIView.as_view(), name="entity-search"),
    path("entities/<str:entity_id>/", views.ProfileDetailAPIView.as_view(), name="entity-detail"),
    path("entities/<str:entity_id>/timeline/", views.TimelineAPIView.as_view(), name="entity-timeline"),
    path("alerts/", views.AlertsListAPIView.as_view(), name="alerts-list"),

]