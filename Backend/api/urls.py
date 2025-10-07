from django.urls import path
from . import views

urlpatterns = [
    path('profile/', views.ProfileViewSet.as_view({'get': 'list'})),
    path("entities/", views.EntitySearchAPIView.as_view(), name="entity-search"),
    path("entities/<str:entity_id>/", views.ProfileDetailAPIView.as_view(), name="entity-detail"),
    path("entities/<str:entity_id>/timeline/", views.TimelineAPIView.as_view(), name="entity-timeline"),
    path("alerts/", views.AlertsListAPIView.as_view(), name="alerts-list"),
    # path("entities/<str:entity_id>/predict_location/", views.PredictLocationAPIView.as_view(), name="predict-location"),
]